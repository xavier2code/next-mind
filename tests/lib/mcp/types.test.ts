import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import type { McpTool, McpToolCallResult, McpSession } from '../../../src/lib/mcp/types';
import { MCP_TOOL_TIMEOUT_MS } from '../../../src/lib/mcp/types';
import type { AuditAction } from '../../../src/types';

describe('MCP Types', () => {
  it('should have @modelcontextprotocol/sdk in package.json dependencies', async () => {
    const pkg = await import('../../../package.json', { assert: { type: 'json' } });
    expect(pkg.default.dependencies).toHaveProperty('@modelcontextprotocol/sdk');
  });

  it('should have reflect-metadata in package.json dependencies', async () => {
    const pkg = await import('../../../package.json', { assert: { type: 'json' } });
    expect(pkg.default.dependencies).toHaveProperty('reflect-metadata');
  });

  it('should have McpTool interface with correct shape', () => {
    // Type assertion test - if this compiles, the interface is correct
    const tool: McpTool = {
      name: 'test-tool',
      description: 'A test tool',
      inputSchema: z.object({ input: z.string() }),
      handler: async (args: unknown) => ({
        content: [{ type: 'text' as const, text: 'result' }],
      }),
    };
    expect(tool.name).toBe('test-tool');
    expect(tool.description).toBe('A test tool');
  });

  it('should have McpToolCallResult interface with correct shape', () => {
    // Type assertion test
    const result: McpToolCallResult = {
      content: [{ type: 'text', text: 'test result' }],
      isError: false,
    };
    expect(result.content).toHaveLength(1);
    expect(result.isError).toBe(false);
  });

  it('should have McpToolCallResult with error support', () => {
    const errorResult: McpToolCallResult = {
      content: [{ type: 'text', text: 'Error: something went wrong' }],
      isError: true,
    };
    expect(errorResult.isError).toBe(true);
  });

  it('should have McpSession interface with correct shape', () => {
    // Type assertion test - server can be a placeholder for testing
    const session: McpSession = {
      id: 'session-123',
      userId: 'user-456',
      server: {} as McpSession['server'], // Mock server for type check
      createdAt: new Date(),
    };
    expect(session.id).toBe('session-123');
    expect(session.userId).toBe('user-456');
    expect(session.createdAt).toBeInstanceOf(Date);
  });

  it('should export MCP_TOOL_TIMEOUT_MS constant', () => {
    expect(MCP_TOOL_TIMEOUT_MS).toBe(30000);
  });

  it('should have tool_invocation in AuditAction union', () => {
    const validAction: AuditAction = 'tool_invocation';
    expect(validAction).toBe('tool_invocation');
  });

  it('should have tool_approval in AuditAction union', () => {
    const validAction: AuditAction = 'tool_approval';
    expect(validAction).toBe('tool_approval');
  });

  it('should have tool_rejection in AuditAction union', () => {
    const validAction: AuditAction = 'tool_rejection';
    expect(validAction).toBe('tool_rejection');
  });
});
