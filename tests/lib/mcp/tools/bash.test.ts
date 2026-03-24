import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import { executeBash, bashTool, ALLOWED_COMMANDS } from '../../../../src/lib/mcp/tools/bash';
import type { McpToolCallResult } from '../../../../src/lib/mcp/types';

// Mock the audit logger
vi.mock('../../../../src/lib/audit', () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}));

describe('executeBash', () => {
  const mockContext = {
    userId: 'test-user-id',
    sessionId: 'test-session-id',
  };

  describe('allowed commands', () => {
    it('should execute "ls" command and return directory listing', async () => {
      const result = await executeBash(
        { command: 'ls', args: [], timeout: 5000 },
        mockContext
      );

      expect(result.isError).toBeFalsy();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      // Should contain some output (files in current directory)
      expect(result.content[0].text.length).toBeGreaterThan(0);
    });

    it('should execute "echo" with arguments', async () => {
      const result = await executeBash(
        { command: 'echo', args: ['hello', 'world'], timeout: 5000 },
        mockContext
      );

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text.trim()).toBe('hello world');
    });

    it('should execute "pwd" to get current directory', async () => {
      const result = await executeBash(
        { command: 'pwd', args: [], timeout: 5000 },
        mockContext
      );

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('/');
    });
  });

  describe('disallowed commands', () => {
    it('should reject "sudo" command with validation error', async () => {
      const result = await executeBash(
        { command: 'sudo', args: ['ls'], timeout: 5000 },
        mockContext
      );

      // The Zod enum validation should fail
      expect(result.isError).toBe(true);
    });

    it('should reject "rm -rf" command', async () => {
      const result = await executeBash(
        { command: 'rm', args: ['-rf', '/'], timeout: 5000 },
        mockContext
      );

      // rm is in the allowed list, but the path validation might fail
      // Actually, rm is allowed but dangerous args should be caught
      expect(result.isError).toBe(true);
    });

    it('should reject "bash" command', async () => {
      const result = await executeBash(
        { command: 'bash', args: ['-c', 'whoami'], timeout: 5000 },
        mockContext
      );

      expect(result.isError).toBe(true);
    });

    it('should reject "python" command', async () => {
      const result = await executeBash(
        { command: 'python', args: ['-c', 'print("hello")'], timeout: 5000 },
        mockContext
      );

      expect(result.isError).toBe(true);
    });
  });

  describe('injection prevention', () => {
    it('should reject command substitution in args', async () => {
      const result = await executeBash(
        { command: 'echo', args: ['$(whoami)'], timeout: 5000 },
        mockContext
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/dangerous|command substitution/i);
    });

    it('should reject pipe in args', async () => {
      const result = await executeBash(
        { command: 'echo', args: ['hello', '|', 'cat'], timeout: 5000 },
        mockContext
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/dangerous|pipe/i);
    });

    it('should reject semicolon in args', async () => {
      const result = await executeBash(
        { command: 'echo', args: ['hello;rm -rf /'], timeout: 5000 },
        mockContext
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/dangerous|separator/i);
    });

    it('should reject backticks in args', async () => {
      const result = await executeBash(
        { command: 'echo', args: ['`whoami`'], timeout: 5000 },
        mockContext
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/dangerous|backtick/i);
    });
  });

  describe('timeout enforcement', () => {
    it('should timeout long-running commands', async () => {
      // Use a command that sleeps for longer than the timeout
      const result = await executeBash(
        { command: 'sleep', args: ['10'], timeout: 1000 }, // 1 second timeout
        mockContext
      );

      // Should error due to timeout
      expect(result.isError).toBe(true);
    }, 15000); // Allow 15s for this test
  });

  describe('non-root execution', () => {
    it('should execute with current user privileges (not root)', async () => {
      // On most systems, tests run as non-root
      // If running as root, the function should handle it appropriately
      const result = await executeBash(
        { command: 'id', args: [], timeout: 5000 },
        mockContext
      );

      expect(result.isError).toBeFalsy();
      // On non-root systems, should not be uid=0
      if (process.getuid && process.getuid() !== 0) {
        expect(result.content[0].text).not.toMatch(/uid=0/);
      }
    });
  });

  describe('audit logging', () => {
    it('should log execution to audit', async () => {
      const { logAudit } = await import('../../../../src/lib/audit');

      await executeBash(
        { command: 'echo', args: ['test'], timeout: 5000 },
        mockContext
      );

      expect(logAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockContext.userId,
          action: 'bash_execution',
          resource: 'mcp_tool',
          resourceId: 'bash',
        })
      );
    });
  });

  describe('argument limits', () => {
    it('should reject commands with too many arguments', async () => {
      // Create an array with more than MAX_ARGS (20)
      const tooManyArgs = Array(25).fill('arg');

      const result = await executeBash(
        { command: 'echo', args: tooManyArgs, timeout: 5000 },
        mockContext
      );

      expect(result.isError).toBe(true);
    });
  });
});

describe('bashTool', () => {
  it('should be a valid McpTool', () => {
    expect(bashTool.name).toBe('bash');
    expect(bashTool.description).toBeDefined();
    expect(bashTool.inputSchema).toBeInstanceOf(z.ZodObject);
    expect(typeof bashTool.handler).toBe('function');
  });

  it('should have correct input schema', () => {
    const schema = bashTool.inputSchema as z.ZodObject<z.ZodRawShape>;

    // Should have command, args, timeout fields
    expect(schema.shape.command).toBeDefined();
    expect(schema.shape.args).toBeDefined();
    expect(schema.shape.timeout).toBeDefined();
  });

  it('handler should execute bash command', async () => {
    const result = (await bashTool.handler({
      command: 'echo',
      args: ['test'],
      timeout: 5000,
    })) as McpToolCallResult;

    expect(result.content).toHaveLength(1);
    expect(result.content[0].text.trim()).toBe('test');
  });
});

describe('ALLOWED_COMMANDS', () => {
  it('should be a readonly array of allowed commands', () => {
    expect(Array.isArray(ALLOWED_COMMANDS)).toBe(true);
    expect(ALLOWED_COMMANDS).toContain('ls');
    expect(ALLOWED_COMMANDS).toContain('cat');
    expect(ALLOWED_COMMANDS).toContain('echo');
    expect(ALLOWED_COMMANDS).toContain('grep');
    expect(ALLOWED_COMMANDS).toContain('find');
  });

  it('should NOT contain dangerous commands', () => {
    expect(ALLOWED_COMMANDS).not.toContain('sudo');
    expect(ALLOWED_COMMANDS).not.toContain('su');
    expect(ALLOWED_COMMANDS).not.toContain('bash');
    expect(ALLOWED_COMMANDS).not.toContain('sh');
    expect(ALLOWED_COMMANDS).not.toContain('python');
    expect(ALLOWED_COMMANDS).not.toContain('node');
    expect(ALLOWED_COMMANDS).not.toContain('curl');
    expect(ALLOWED_COMMANDS).not.toContain('wget');
    expect(ALLOWED_COMMANDS).not.toContain('nc');
    expect(ALLOWED_COMMANDS).not.toContain('dd');
    expect(ALLOWED_COMMANDS).not.toContain('mkfs');
    expect(ALLOWED_COMMANDS).not.toContain('fdisk');
  });

  it('should contain write commands that require caution', () => {
    // These are allowed but should be used carefully
    expect(ALLOWED_COMMANDS).toContain('mkdir');
    expect(ALLOWED_COMMANDS).toContain('touch');
    expect(ALLOWED_COMMANDS).toContain('rm');
    expect(ALLOWED_COMMANDS).toContain('cp');
    expect(ALLOWED_COMMANDS).toContain('mv');
  });
});
