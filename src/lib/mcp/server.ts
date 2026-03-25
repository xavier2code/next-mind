import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

/**
 * Create a configured MCP server instance
 *
 * @param _sessionId - Unique identifier for this server session (unused but kept for API compatibility)
 * @returns Configured McpServer with capabilities
 */
export function createMcpServer(_sessionId: string): McpServer {
  const server = new McpServer(
    { name: 'next-mind-mcp', version: '1.0.0' },
    { capabilities: { tools: {} } }
  );

  // Note: Tool registration is handled via ToolRegistry and route.ts
  // The MCP SDK's McpServer class provides tool() method for registration
  // Route handlers in /api/mcp/route.ts handle tools/list and tools/call

  return server;
}
