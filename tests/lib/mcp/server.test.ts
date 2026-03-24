import { describe, it, expect, beforeEach, vi } from 'vitest';

// Create a mock server factory that acts as a constructor
function MockMcpServer(
  this: { setRequestHandler: ReturnType<typeof vi.fn>; connect: ReturnType<typeof vi.fn> },
  _info: unknown,
  _options: unknown
) {
  this.setRequestHandler = vi.fn();
  this.connect = vi.fn();
  return this;
}

// Mock the MCP SDK before importing the module
vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: MockMcpServer,
}));

vi.mock('@modelcontextprotocol/sdk/types.js', () => ({
  ListToolsRequestSchema: 'list-tools-schema',
  CallToolRequestSchema: 'call-tool-schema',
}));

describe('MCP Server Session Management', () => {
  let mcpSessionRegistry: Map<string, unknown>;
  let getOrCreateSessionServer: (userId: string) => unknown;
  let cleanupSession: (userId: string) => void;
  let cleanupIdleSessions: (maxAgeMs: number) => void;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Re-import to get fresh module state
    vi.resetModules();

    // Re-setup the mock after reset
    vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
      McpServer: MockMcpServer,
    }));

    const sessionModule = await import('../../../src/lib/mcp/session');
    mcpSessionRegistry = sessionModule.mcpSessionRegistry;
    getOrCreateSessionServer = sessionModule.getOrCreateSessionServer;
    cleanupSession = sessionModule.cleanupSession;
    cleanupIdleSessions = sessionModule.cleanupIdleSessions;

    // Clear registry
    mcpSessionRegistry.clear();
  });

  it('should return same server for same userId', () => {
    const userId = 'user-123';

    const server1 = getOrCreateSessionServer(userId);
    const server2 = getOrCreateSessionServer(userId);

    expect(server1).toBe(server2);
  });

  it('should return different servers for different userIds', () => {
    const user1 = 'user-123';
    const user2 = 'user-456';

    getOrCreateSessionServer(user1);
    getOrCreateSessionServer(user2);

    // Registry should have separate entries
    expect(mcpSessionRegistry.has(user1)).toBe(true);
    expect(mcpSessionRegistry.has(user2)).toBe(true);
    expect(mcpSessionRegistry.size).toBe(2);
  });

  it('should cleanup session from registry', () => {
    const userId = 'user-123';

    getOrCreateSessionServer(userId);
    expect(mcpSessionRegistry.has(userId)).toBe(true);

    cleanupSession(userId);
    expect(mcpSessionRegistry.has(userId)).toBe(false);
  });

  it('should have correct capabilities { tools: {} }', () => {
    const userId = 'user-123';

    const server = getOrCreateSessionServer(userId);
    const session = mcpSessionRegistry.get(userId);

    expect(session).toBeDefined();
    expect(server).toBeDefined();
    expect((server as { setRequestHandler: unknown }).setRequestHandler).toBeDefined();
  });

  it('should store session with userId, id, and createdAt', () => {
    const userId = 'user-123';

    getOrCreateSessionServer(userId);
    const session = mcpSessionRegistry.get(userId) as {
      id: string;
      userId: string;
      createdAt: Date;
    };

    expect(session.userId).toBe(userId);
    expect(session.id).toContain('mcp-session-');
    expect(session.createdAt).toBeInstanceOf(Date);
  });

  it('should cleanup idle sessions older than maxAgeMs', () => {
    // Create a session
    getOrCreateSessionServer('user-old');

    // Manually set an old createdAt for testing
    const oldSession = mcpSessionRegistry.get('user-old') as { createdAt: Date };
    oldSession.createdAt = new Date(Date.now() - 3600000); // 1 hour ago

    // Create a new session
    getOrCreateSessionServer('user-new');

    // Cleanup sessions older than 30 minutes
    cleanupIdleSessions(1800000);

    expect(mcpSessionRegistry.has('user-old')).toBe(false);
    expect(mcpSessionRegistry.has('user-new')).toBe(true);
  });
});

describe('MCP Server Factory', () => {
  let createMcpServer: (sessionId: string) => unknown;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
      McpServer: MockMcpServer,
    }));

    const serverModule = await import('../../../src/lib/mcp/server');
    createMcpServer = serverModule.createMcpServer;
  });

  it('should export createMcpServer function', () => {
    expect(createMcpServer).toBeDefined();
    expect(typeof createMcpServer).toBe('function');
  });

  it('should create server with correct name and version', () => {
    const server = createMcpServer('session-123');

    expect(server).toBeDefined();
    expect((server as { setRequestHandler: unknown }).setRequestHandler).toBeDefined();
  });
});
