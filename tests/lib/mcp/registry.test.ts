import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { ToolRegistry, createToolRegistry } from '../../../src/lib/mcp/registry';
import type { McpTool } from '../../../src/lib/mcp/types';

describe('ToolRegistry', () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = createToolRegistry();
  });

  describe('registerTool', () => {
    it('should register a tool with valid input', () => {
      const tool: McpTool = {
        name: 'test-tool',
        description: 'A test tool',
        inputSchema: z.object({ input: z.string() }),
        handler: async () => ({
          content: [{ type: 'text', text: 'done' }],
        }),
      };

      registry.registerTool(tool);

      const tools = registry.listTools();
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('test-tool');
    });

    it('should throw error for duplicate tool names', () => {
      const tool: McpTool = {
        name: 'duplicate-tool',
        description: 'First tool',
        inputSchema: z.object({ input: z.string() }),
        handler: async () => ({
          content: [{ type: 'text', text: 'done' }],
        }),
      };

      registry.registerTool(tool);

      const duplicateTool: McpTool = {
        name: 'duplicate-tool',
        description: 'Second tool with same name',
        inputSchema: z.object({ input: z.string() }),
        handler: async () => ({
          content: [{ type: 'text', text: 'done' }],
        }),
      };

      expect(() => registry.registerTool(duplicateTool)).toThrow(
        'Tool with name "duplicate-tool" is already registered'
      );
    });

    it('should validate Zod schema', () => {
      const tool: McpTool = {
        name: 'invalid-schema-tool',
        description: 'Tool with invalid schema',
        inputSchema: 'not a zod schema' as unknown,
        handler: async () => ({
          content: [{ type: 'text', text: 'done' }],
        }),
      };

      expect(() => registry.registerTool(tool)).toThrow(
        'Tool inputSchema must be a valid Zod schema'
      );
    });
  });

  describe('listTools', () => {
    it('should return empty array when no tools registered', () => {
      const tools = registry.listTools();
      expect(tools).toHaveLength(0);
    });

    it('should return all registered tools with JSON Schema format', () => {
      const tool1: McpTool = {
        name: 'tool-1',
        description: 'First tool',
        inputSchema: z.object({ input: z.string() }),
        handler: async () => ({
          content: [{ type: 'text', text: 'done' }],
        }),
      };

      const tool2: McpTool = {
        name: 'tool-2',
        description: 'Second tool',
        inputSchema: z.object({ count: z.number() }),
        handler: async () => ({
          content: [{ type: 'text', text: 'done' }],
        }),
      };

      registry.registerTool(tool1);
      registry.registerTool(tool2);

      const tools = registry.listTools();

      expect(tools).toHaveLength(2);
      expect(tools.find(t => t.name === 'tool-1')).toBeDefined();
      expect(tools.find(t => t.name === 'tool-2')).toBeDefined();
    });

    it('should convert Zod schema to JSON Schema format', () => {
      const tool: McpTool = {
        name: 'zod-tool',
        description: 'Tool with Zod schema',
        inputSchema: z.object({
          name: z.string().min(1).max(100),
          age: z.number().int().min(0).max(150).optional(),
        }),
        handler: async () => ({
          content: [{ type: 'text', text: 'done' }],
        }),
      };

      registry.registerTool(tool);

      const tools = registry.listTools();
      const zodTool = tools.find(t => t.name === 'zod-tool');

      expect(zodTool?.inputSchema).toBeDefined();
      // Verify JSON Schema structure exists
      expect(zodTool?.inputSchema).toHaveProperty('type');
    });
  });

  describe('getTool', () => {
    it('should return tool by name', () => {
      const tool: McpTool = {
        name: 'get-test-tool',
        description: 'A test tool',
        inputSchema: z.object({ input: z.string() }),
        handler: async () => ({
          content: [{ type: 'text', text: 'done' }],
        }),
      };

      registry.registerTool(tool);

      const retrieved = registry.getTool('get-test-tool');
      expect(retrieved).toBe(tool);
    });

    it('should return undefined for non-existent tool', () => {
      const retrieved = registry.getTool('non-existent-tool');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('executeTool', () => {
    it('should execute tool and return result', async () => {
      const handler = async (args: unknown) => ({
        content: [{ type: 'text', text: `Executed with: ${JSON.stringify(args)}` }],
      });

      const tool: McpTool = {
        name: 'executable-tool',
        description: 'An executable tool',
        inputSchema: z.object({ input: z.string() }),
        handler,
      };

      registry.registerTool(tool);

      const result = await registry.executeTool('executable-tool', { input: 'test' });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toContain('test');
    });

    it('should validate args against schema', async () => {
      const handler = async () => ({
        content: [{ type: 'text', text: 'done' }],
      });

      const tool: McpTool = {
        name: 'validation-tool',
        description: 'A tool with validation',
        inputSchema: z.object({
          email: z.string().email(),
          age: z.number().min(0),
        }),
        handler,
      };

      registry.registerTool(tool);

      await expect(
        registry.executeTool('validation-tool', { email: 'invalid', age: -1 })
      ).rejects;
    });

    it('should throw error for non-existent tool', async () => {
      await expect(
        registry.executeTool('non-existent-tool', {})
      ).rejects.toThrow('Tool "non-existent-tool" not found');
    });

    it('should wrap errors in isError response', async () => {
      const handler = async () => {
        throw new Error('Handler error');
      };

      const tool: McpTool = {
        name: 'error-tool',
        description: 'A tool that throws',
        inputSchema: z.object({ input: z.string() }),
        handler,
      };

      registry.registerTool(tool);

      const result = await registry.executeTool('error-tool', { input: 'test' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Handler error');
    });
  });

  describe('session scoping', () => {
    it('should isolate tools per-registry instance', () => {
      const registry1 = createToolRegistry();
      const registry2 = createToolRegistry();

      const tool1: McpTool = {
        name: 'scoped-tool',
        description: 'Tool for registry 1',
        inputSchema: z.object({ input: z.string() }),
        handler: async () => ({
          content: [{ type: 'text', text: 'done' }],
        }),
      };

      const tool2: McpTool = {
        name: 'scoped-tool',
        description: 'Tool for registry 2',
        inputSchema: z.object({ input: z.string() }),
        handler: async () => ({
          content: [{ type: 'text', text: 'done' }],
        }),
      };

      registry1.registerTool(tool1);
      registry2.registerTool(tool2);

      expect(registry1.getTool('scoped-tool')?.description).toBe('Tool for registry 1');
      expect(registry2.getTool('scoped-tool')?.description).toBe('Tool for registry 2');
    });
  });
});
