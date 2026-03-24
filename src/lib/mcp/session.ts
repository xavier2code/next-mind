import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpSession } from './types';
import { createResourceManager } from './resources';
import { createPromptManager } from './prompts';

/**
 * Session-scoped MCP server registry
 * Maps userId to McpSession for isolated tool state per user
 */
export const mcpSessionRegistry = new Map<string, McpSession>();

/**
 * Get or create a session-scoped MCP server for a user
 * If session exists for userId, returns existing server
 * Otherwise creates new McpServer with session isolation
 *
 * @param userId - The authenticated user's ID
 * @returns McpServer instance scoped to the user's session
 */
export function getOrCreateSessionServer(userId: string): McpServer {
  const existingSession = mcpSessionRegistry.get(userId);

  if (existingSession) {
    return existingSession.server;
  }

  // Create new session-scoped server
  const server = new McpServer(
    { name: 'next-mind-mcp', version: '1.0.0' },
    { capabilities: { tools: {} } }
  );

  // Create session-scoped resource and prompt managers
  const resourceManager = createResourceManager();
  const promptManager = createPromptManager({ includeBuiltins: true });

  const session: McpSession = {
    id: `mcp-session-${userId}-${Date.now()}`,
    userId,
    server,
    createdAt: new Date(),
    resourceManager,
    promptManager,
  };

  mcpSessionRegistry.set(userId, session);

  return server;
}

/**
 * Get the full session object for a user
 * Returns the session with resource and prompt managers
 *
 * @param userId - The authenticated user's ID
 * @returns McpSession or undefined if not found
 */
export function getSession(userId: string): McpSession | undefined {
  return mcpSessionRegistry.get(userId);
}

/**
 * Remove a user's session from the registry
 * Call this when user logs out or session expires
 *
 * @param userId - The user ID to cleanup
 */
export function cleanupSession(userId: string): void {
  mcpSessionRegistry.delete(userId);
}

/**
 * Remove sessions older than maxAgeMs
 * Useful for cleaning up idle sessions
 *
 * @param maxAgeMs - Maximum age in milliseconds before cleanup
 */
export function cleanupIdleSessions(maxAgeMs: number): void {
  const now = Date.now();

  for (const [userId, session] of mcpSessionRegistry.entries()) {
    const sessionAge = now - session.createdAt.getTime();
    if (sessionAge > maxAgeMs) {
      mcpSessionRegistry.delete(userId);
    }
  }
}
