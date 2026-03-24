import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getOrCreateSessionServer, getSession } from '@/lib/mcp/session';
import { logAudit, getClientInfo } from '@/lib/audit';
import { logger, generateRequestId } from '@/lib/monitoring';
import { createResourceManager, type ResourceManager } from '@/lib/mcp/resources';
import { createPromptManager, type PromptManager } from '@/lib/mcp/prompts';

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
  FORBIDDEN: { code: -32003, message: 'Forbidden - Invalid Origin' },
} as const;

/**
 * Validate Origin header to prevent DNS rebinding attacks
 * Only allows requests from localhost origins or same-origin (no Origin header)
 *
 * MCP endpoints are designed for localhost-only access as a security measure.
 * External origins are blocked to prevent DNS rebinding attacks where a
 * malicious website could make requests to a local MCP server.
 *
 * @param request - The incoming request
 * @returns true if origin is valid, false otherwise
 */
function isValidOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');

  // No origin header = same-origin request (browser navigation, curl, etc.)
  // This is allowed for localhost-only access
  if (!origin) {
    return true;
  }

  // Allow localhost origins (development and production on same machine)
  try {
    const url = new URL(origin);
    const allowedHosts = ['localhost', '127.0.0.1', '::1'];
    const isAllowedHost = allowedHosts.includes(url.hostname);

    // Also allow any .localhost subdomain
    const isLocalhostSubdomain = url.hostname.endsWith('.localhost');

    return isAllowedHost || isLocalhostSubdomain;
  } catch {
    return false;
  }
}

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

  // DNS Rebinding Protection: Validate Origin header
  // MCP endpoints are localhost-only - reject external origins
  if (!isValidOrigin(request)) {
    const origin = request.headers.get('origin');
    logger.securityEvent('Invalid Origin header - potential DNS rebinding attack', undefined, {
      origin,
      path: '/api/mcp',
    });
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        error: JSON_RPC_ERRORS.FORBIDDEN,
        id: null,
      },
      { status: 403 }
    );
  }

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
    const mcpSession = getSession(userId);

    // Get or create resource and prompt managers for this session
    let resourceManager: ResourceManager;
    let promptManager: PromptManager;

    if (mcpSession) {
      resourceManager = mcpSession.resourceManager;
      promptManager = mcpSession.promptManager;
    } else {
      // Fallback: create new managers if session doesn't exist
      resourceManager = createResourceManager();
      promptManager = createPromptManager({ includeBuiltins: true });
    }

    // Register built-in session resources (only if not already registered)
    if (!resourceManager.getResource('data://session/info')) {
      resourceManager.registerResource({
        uri: 'data://session/info',
        name: 'Session Info',
        description: 'Current session metadata including userId and createdAt',
        mimeType: 'application/json',
        read: async () => {
          return JSON.stringify({
            userId,
            createdAt: mcpSession?.createdAt ?? new Date(),
          });
        },
      });
    }

    if (!resourceManager.getResource('data://tools/list')) {
      resourceManager.registerResource({
        uri: 'data://tools/list',
        name: 'Tools List',
        description: 'List of available MCP tools',
        mimeType: 'application/json',
        read: async () => {
          return JSON.stringify([]);
        },
      });
    }

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

      case 'resources/list': {
        const resources = resourceManager.listResources();
        result = { resources };
        break;
      }

      case 'resources/read': {
        const uri = body.params?.uri as string;

        if (!uri) {
          return NextResponse.json(
            {
              jsonrpc: '2.0',
              error: JSON_RPC_ERRORS.INVALID_PARAMS,
              id: body.id ?? null,
            },
            { status: 200 }
          );
        }

        try {
          result = await resourceManager.readResource(uri);

          // Log audit entry for resource read (fire-and-forget)
          logAudit({
            userId,
            action: 'resource_read',
            resource: 'mcp_resource',
            resourceId: uri,
            ...getClientInfo(request),
          }).catch(() => {
            // Log error but don't fail
          });
        } catch (error) {
          return NextResponse.json(
            {
              jsonrpc: '2.0',
              error: {
                code: JSON_RPC_ERRORS.INVALID_PARAMS.code,
                message: `Invalid params: ${error instanceof Error ? error.message : String(error)}`,
              },
              id: body.id ?? null,
            },
            { status: 200 }
          );
        }
        break;
      }

      case 'prompts/list': {
        const prompts = promptManager.listPrompts();
        result = { prompts };
        break;
      }

      case 'prompts/get': {
        const promptName = body.params?.name as string;
        const promptArgs = (body.params?.arguments as Record<string, string>) ?? {};

        if (!promptName) {
          return NextResponse.json(
            {
              jsonrpc: '2.0',
              error: JSON_RPC_ERRORS.INVALID_PARAMS,
              id: body.id ?? null,
            },
            { status: 200 }
          );
        }

        try {
          result = await promptManager.getPrompt(promptName, promptArgs);

          // Log audit entry for prompt get (fire-and-forget)
          logAudit({
            userId,
            action: 'prompt_get',
            resource: 'mcp_prompt',
            resourceId: promptName,
            metadata: { arguments: promptArgs },
            ...getClientInfo(request),
          }).catch(() => {
            // Log error but don't fail
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);

          // Determine error code based on error type
          if (errorMessage.includes('not found')) {
            return NextResponse.json(
              {
                jsonrpc: '2.0',
                error: {
                  code: JSON_RPC_ERRORS.METHOD_NOT_FOUND.code,
                  message: `Method not found: ${errorMessage}`,
                },
                id: body.id ?? null,
              },
              { status: 200 }
            );
          }

          return NextResponse.json(
            {
              jsonrpc: '2.0',
              error: {
                code: JSON_RPC_ERRORS.INVALID_PARAMS.code,
                message: `Invalid params: ${errorMessage}`,
              },
              id: body.id ?? null,
            },
            { status: 200 }
          );
        }
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
