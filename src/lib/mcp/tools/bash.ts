/**
 * Sandboxed bash execution tool for MCP
 * Provides secure command execution with allowlisting, input sanitization,
 * timeout enforcement, and non-root execution.
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import { z } from 'zod';
import { sanitizeCommandArg } from '../validation';
import { logAudit } from '@/lib/audit';
import type { McpTool, McpToolCallResult } from '../types';

const execFileAsync = promisify(execFile);

/**
 * Allowed commands for bash execution
 * Read-only: safe for inspection
 * Write: require caution (may need approval in future)
 */
export const ALLOWED_COMMANDS = [
  // Read-only commands
  'ls',
  'cat',
  'head',
  'tail',
  'grep',
  'find',
  'wc',
  'echo',
  'pwd',
  'id',
  'whoami',
  'date',
  'uname',
  'df',
  'du',
  'stat',
  'file',
  'tree',
  'sleep',
  // Write commands (require caution)
  'mkdir',
  'touch',
  'rm',
  'cp',
  'mv',
  'chmod',
  'chown',
] as const;

/**
 * Commands that are explicitly blocked even if they could theoretically be useful
 * These pose significant security risks
 */
const BLOCKED_COMMANDS = [
  'sudo',
  'su',
  'bash',
  'sh',
  'zsh',
  'python',
  'python3',
  'node',
  'npm',
  'npx',
  'curl',
  'wget',
  'nc',
  'netcat',
  'dd',
  'mkfs',
  'fdisk',
  'parted',
  'systemctl',
  'service',
  'crontab',
  'at',
  'screen',
  'tmux',
  'ssh',
  'scp',
  'rsync',
  'iptables',
  'ip6tables',
  'env',
  'export',
  'set',
  'unset',
  'source',
  'eval',
  'exec',
] as const;

/**
 * Default timeout for command execution (30 seconds)
 */
export const DEFAULT_TIMEOUT_MS = 30000;

/**
 * Maximum timeout allowed (60 seconds)
 */
export const MAX_TIMEOUT_MS = 60000;

/**
 * Minimum timeout allowed (1 second)
 */
export const MIN_TIMEOUT_MS = 1000;

/**
 * Maximum number of arguments allowed
 */
export const MAX_ARGS = 20;

/**
 * Input schema for bash tool using Zod
 */
const BashInputSchema = z.object({
  command: z.enum(ALLOWED_COMMANDS).describe('The command to execute'),
  args: z
    .array(z.string())
    .max(MAX_ARGS, `Maximum ${MAX_ARGS} arguments allowed`)
    .default([])
    .describe('Command arguments'),
  timeout: z
    .number()
    .min(MIN_TIMEOUT_MS)
    .max(MAX_TIMEOUT_MS)
    .default(DEFAULT_TIMEOUT_MS)
    .describe('Execution timeout in milliseconds'),
  cwd: z.string().optional().describe('Working directory for command execution'),
});

type BashInput = z.infer<typeof BashInputSchema>;

/**
 * Context passed to the bash tool for auditing
 */
export interface BashExecutionContext {
  userId: string;
  sessionId: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Execute a bash command in a sandboxed environment
 *
 * @param input - The command input (validated against schema)
 * @param context - Execution context for auditing
 * @returns Tool execution result
 */
export async function executeBash(
  input: unknown,
  context: BashExecutionContext
): Promise<McpToolCallResult> {
  // Validate input against schema
  let validatedInput: BashInput;
  try {
    validatedInput = BashInputSchema.parse(input);
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Invalid input: ${error instanceof Error ? error.message : 'Validation failed'}`,
        },
      ],
      isError: true,
    };
  }

  const { command, args, timeout, cwd } = validatedInput;

  // Check for non-root execution (security requirement)
  if (process.getuid && process.getuid() === 0) {
    return {
      content: [
        {
          type: 'text',
          text: 'Security error: Commands cannot be executed as root user',
        },
      ],
      isError: true,
    };
  }

  // Sanitize all arguments to prevent injection
  try {
    for (const arg of args) {
      sanitizeCommandArg(arg);
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Sanitization failed';
    return {
      content: [
        {
          type: 'text',
          text: `Injection attempt detected: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }

  // Additional check for dangerous argument patterns specific to bash tool
  for (const arg of args) {
    // Block rm -rf / or similar
    if (command === 'rm' && arg.includes('/')) {
      // Allow relative paths but warn about absolute paths to critical directories
      const criticalPaths = ['/', '/etc', '/root', '/home', '/usr', '/var', '/sys', '/proc'];
      if (criticalPaths.some((p) => arg === p || arg.startsWith(`${p}/`))) {
        return {
          content: [
            {
              type: 'text',
              text: `Security error: Cannot delete critical system path: ${arg}`,
            },
          ],
          isError: true,
        };
      }
    }
  }

  // Log execution attempt (fire-and-forget)
  logAudit({
    userId: context.userId,
    action: 'bash_execution',
    resource: 'mcp_tool',
    resourceId: 'bash',
    metadata: {
      command,
      args,
      timeout,
      cwd,
      sessionId: context.sessionId,
    },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  }).catch(() => {
    // Don't fail execution if audit logging fails
  });

  // Build minimal environment
  const env: NodeJS.ProcessEnv = {
    PATH: process.env.PATH || '',
    HOME: process.env.HOME || '',
    USER: process.env.USER || '',
    LANG: process.env.LANG || 'en_US.UTF-8',
  };

  // Execute command using execFile (safer than exec)
  try {
    const result = await execFileAsync(command, args, {
      timeout,
      cwd: cwd || process.cwd(),
      env,
      maxBuffer: 1024 * 1024, // 1MB buffer
      windowsHide: true,
    });

    return {
      content: [
        {
          type: 'text',
          text: result.stdout || result.stderr || 'Command completed with no output',
        },
      ],
      isError: false,
    };
  } catch (error) {
    // Handle timeout errors
    if (error instanceof Error && error.message.includes('timeout')) {
      return {
        content: [
          {
            type: 'text',
            text: `Command timed out after ${timeout}ms`,
          },
        ],
        isError: true,
      };
    }

    // Handle other execution errors
    const execError = error as { stderr?: string; message?: string };
    return {
      content: [
        {
          type: 'text',
          text: execError.stderr || execError.message || 'Command execution failed',
        },
      ],
      isError: true,
    };
  }
}

/**
 * MCP Tool definition for bash execution
 */
export const bashTool: McpTool = {
  name: 'bash',
  description:
    'Execute allowed bash commands in a sandboxed environment. ' +
    'Commands are validated against an allowlist and arguments are sanitized ' +
    'to prevent injection attacks. Commands timeout after a configurable duration.',
  inputSchema: BashInputSchema,
  handler: async (args: unknown): Promise<McpToolCallResult> => {
    // Default context for tool handler (would be injected by MCP server in production)
    const defaultContext: BashExecutionContext = {
      userId: 'system',
      sessionId: 'default',
    };

    return executeBash(args, defaultContext);
  },
};
