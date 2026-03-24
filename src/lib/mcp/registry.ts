import { z } from 'zod';
import { toJsonSchemaCompat } from '@modelcontextprotocol/sdk/server/zod-json-schema-compat.js';
import type { McpTool, McpToolCallResult } from './types';

/**
 * Tool registry for registering and discovering tools
 * Supports session-scoped tool isolation
 */
export class ToolRegistry {
  private tools: Map<string, McpTool> = new Map();

  /**
   * Register a tool with the registry
   * @throws Error if tool name is duplicate or schema is invalid
   */
  registerTool(tool: McpTool): void {
    // Check for duplicate name
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool with name "${tool.name}" is already registered`);
    }

    // Validate that inputSchema is a Zod schema
    if (!this.isZodSchema(tool.inputSchema)) {
      throw new Error('Tool inputSchema must be a valid Zod schema');
    }

    this.tools.set(tool.name, tool);
  }

  /**
   * List all registered tools with JSON Schema format
   */
  listTools(): Array<{ name: string; description: string; inputSchema: unknown }> {
    const tools: Array<{ name: string; description: string; inputSchema: unknown }> =
      [];

    for (const [name, tool] of this.tools) {
      tools.push({
        name,
        description: tool.description,
        inputSchema: toJsonSchemaCompat(tool.inputSchema),
      });
    }

    return tools;
  }

  /**
   * Get a specific tool by name
   * @returns The tool or undefined if not found
   */
  getTool(name: string): McpTool | undefined {
    return this.tools.get(name);
  }

  /**
   * Execute a tool with the given arguments
   * Validates args against the tool's schema
   * @returns Tool execution result
   */
  async executeTool(name: string, args: unknown): Promise<McpToolCallResult> {
    const tool = this.tools.get(name);

    if (!tool) {
      throw new Error(`Tool "${name}" not found`);
    }

    try {
      // Validate args against schema
      const validatedArgs = tool.inputSchema.parse(args);

      // Execute tool handler
      const result = await tool.handler(validatedArgs);

      return result;
    } catch (error) {
      // Wrap errors in error response
      return {
        content: [
          {
            type: 'text',
            text: error instanceof Error ? error.message : String(error),
          },
        ],
        isError: true,
      };
    }
  }

  /**
   * Check if a value is a Zod schema
   */
  private isZodSchema(schema: unknown): boolean {
    // Zod schemas have specific properties
    return (
      schema !== null &&
      typeof schema === 'object' &&
      '_def' in schema &&
      'parse' in schema &&
      'safeParse' in schema
    );
  }
}

/**
 * Create a new tool registry instance
 * Use this for session-scoped registries
 */
export function createToolRegistry(): ToolRegistry {
  return new ToolRegistry();
}
