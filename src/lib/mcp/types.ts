import type { ZodSchema } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ResourceManager } from './resources';
import type { PromptManager } from './prompts';
import type { ToolRegistry } from './registry';

/**
 * MCP Tool timeout in milliseconds
 */
export const MCP_TOOL_TIMEOUT_MS = 30000;

/**
 * Result of a tool call in MCP format
 */
export interface McpToolCallResult {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
}

/**
 * Represents a tool that can be registered with the MCP server
 */
export interface McpTool {
  name: string;
  description: string;
  inputSchema: ZodSchema<unknown>;
  handler: (args: unknown) => Promise<McpToolCallResult>;
}

/**
 * Session-scoped MCP server instance
 */
export interface McpSession {
  id: string;
  userId: string;
  server: McpServer;
  createdAt: Date;
  /** Session-scoped resource manager */
  resourceManager: ResourceManager;
  /** Session-scoped prompt manager */
  promptManager: PromptManager;
  /** Session-scoped tool registry */
  registry: ToolRegistry;
}
