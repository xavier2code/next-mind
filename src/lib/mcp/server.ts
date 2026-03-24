import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

/**
 * Create a configured MCP server instance
 *
 * @param sessionId - Unique identifier for this server session
 * @returns Configured McpServer with request handlers
 */
export function createMcpServer(sessionId: string): McpServer {
  const server = new McpServer(
    { name: 'next-mind-mcp', version: '1.0.0' },
    { capabilities: { tools: {} } }
  );

  // Set up request handlers for tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    // Will be connected to ToolRegistry in session.ts
    return { tools: [] };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    // Will be connected to ToolRegistry.executeTool in session.ts
    return {
      content: [
        {
          type: 'text' as const,
          text: `Tool execution not yet configured for session ${sessionId}`,
        },
      ],
      isError: true,
    };
  });

  return server;
}
