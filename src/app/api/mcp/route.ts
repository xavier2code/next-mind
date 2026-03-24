import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getOrCreateSessionServer } from '@/lib/mcp/session';
import { logAudit, getClientInfo } from '@/lib/audit';
import { logger, generateRequestId } from '@/lib/monitoring';

export const maxDuration = 30;

/**
 * JSON-RPC 2.0 error codes
 */
const JSON_RPC_ERRORS = {
  PARSE_ERROR: { code: -32700, message: 'Parse error' },
  INVALID_REQUEST: { code: -32600, message: 'Invalid Request' },
  METHOD_NOT_FOUND: { code: -32601, message: 'Method not found' },
  INVALID_PARAMS: { code: -32602, message: 'Invalid params' },
  INTERNAL_ERROR: { code: -32603, message: 'Internal error' },
  UNAUTHORIZED: { code: -32001, message: 'Unauthorized' },
} as const;

/**
 * JSON-RPC 2.0 request interface
 */
interface JsonRpcRequest {
  jsonrpc: string;
  method: string;
  params?: Record<string, unknown>;
  id?: string | number;
}

/**
 * JSON-RPC 2.0 response interface
 */
interface JsonRpcResponse {
  jsonrpc: '2.0';
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
  id: string | number | null;
}

/**
 * MCP API Endpoint
 * Handles JSON-RPC 2.0 requests for MCP protocol
 */
export async function POST(request: NextRequest): Promise<NextResponse<JsonRpcResponse>> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  // Authenticate user
  const session = await auth();
  if (!session?.user?.id) {
    logger.apiRequest(requestId, 'POST', '/api/mcp');
    logger.securityEvent('Unauthenticated MCP attempt', undefined);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;
  logger.apiRequest(requestId, 'POST', '/api/mcp', userId);

  try {
    // Parse request body
    let body: JsonRpcRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          jsonrpc: '2.0',
          error: JSON_RPC_ERRORS.PARSE_ERROR,
          id: null,
        },
        { status: 400 }
      );
    }

    // Validate JSON-RPC 2.0 format
    if (body.jsonrpc !== '2.0' || !body.method) {
      return NextResponse.json(
        {
          jsonrpc: '2.0',
          error: JSON_RPC_ERRORS.INVALID_REQUEST,
          id: body.id ?? null,
        },
        { status: 400 }
      );
    }

    // Get session-scoped server
    const server = getOrCreateSessionServer(userId);

    // Route to appropriate handler based on method
    let result: unknown;

    switch (body.method) {
      case 'tools/list': {
        // Return list of registered tools
        // The server will handle this through its request handlers
        // For now, return empty tools list
        result = { tools: [] };
        break;
      }

      case 'tools/call': {
        const toolName = body.params?.name as string;
        const toolArgs = body.params?.arguments as Record<string, unknown>;

        if (!toolName) {
          return NextResponse.json(
            {
              jsonrpc: '2.0',
            error: JSON_RPC_ERRORS.INVALID_PARAMS,
            id: body.id ?? null,
          },
          { status: 400 }
        );
        }

        // Log audit entry for tool invocation (fire-and-forget)
        logAudit({
          userId,
          action: 'tool_invocation',
          resource: 'mcp_tool',
          resourceId: toolName,
          metadata: { arguments: toolArgs },
          ...getClientInfo(request),
        }).catch(() => {
          // Log error but don't fail
        });

        // For now, return a placeholder response
        // The actual tool execution will be connected to the registry
        result = {
          content: [
            {
              type: 'text',
              text: `Tool "${toolName}" execution not yet implemented`,
            },
          ],
          isError: true,
        };
        break;
      }

      default: {
        return NextResponse.json(
          {
            jsonrpc: '2.0',
            error: JSON_RPC_ERRORS.METHOD_NOT_FOUND,
            id: body.id ?? null,
          },
          { status: 400 }
        );
      }
    }

    const durationMs = Date.now() - startTime;
    logger.apiResponse(requestId, 'POST', '/api/mcp', 200, durationMs);

    return NextResponse.json({
      jsonrpc: '2.0',
      result,
      id: body.id ?? null,
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    logger.error(
      'api',
      'MCP API error',
      error instanceof Error ? error : new Error(String(error)),
      { requestId, userId, durationMs }
    );

    logger.apiResponse(requestId, 'POST', '/api/mcp', 500, durationMs);

    return NextResponse.json(
      {
        jsonrpc: '2.0',
        error: JSON_RPC_ERRORS.INTERNAL_ERROR,
        id: null,
      },
      { status: 500 }
    );
  }
}

/**
 * Health check endpoint
 * No authentication required
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: 'ok',
    version: '1.0.0',
  });
}
