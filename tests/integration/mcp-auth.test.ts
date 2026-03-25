import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock next-auth at the top level
const mockAuth = vi.fn();
vi.mock('@/auth', () => ({
  auth: mockAuth,
}));

// Mock the MCP session module
const mockGetOrCreateSessionServer = vi.fn();
const mockGetSession = vi.fn();
vi.mock('@/lib/mcp/session', () => ({
  getOrCreateSessionServer: mockGetOrCreateSessionServer,
  getSession: mockGetSession,
  mcpSessionRegistry: new Map(),
})
);

// Mock audit logging
const mockLogAudit = vi.fn();
vi.mock('@/lib/audit', () => ({
  logAudit: mockLogAudit,
  getClientInfo: vi.fn().mockReturnValue({ ipAddress: '127.0.0.1', userAgent: 'test-agent' }),
}));

 // Mock monitoring
const mockSecurityEvent = vi.fn();
vi.mock('@/lib/monitoring', () => ({
  logger: {
    apiRequest: vi.fn(),
    apiResponse: vi.fn(),
    securityEvent: mockSecurityEvent,
    error: vi.fn(),
  },
  generateRequestId: vi.fn().mockReturnValue('req-test-123'),
}));

 // Mock MCP resources and prompts
vi.mock('@/lib/mcp/resources', () => ({
  createResourceManager: vi.fn().mockReturnValue({
    registerResource: vi.fn(),
    listResources: vi.fn().mockReturnValue([]),
    readResource: vi.fn(),
    getResource: vi.fn().mockReturnValue(null),
  }),
}));

// Mock MCP prompts
vi.mock('@/lib/mcp/prompts', () => ({
  createPromptManager: vi.fn().mockReturnValue({
    listPrompts: vi.fn().mockReturnValue([]),
    getPrompt: vi.fn(),
  }),
}));

describe('MCP API Endpoint Authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/mcp', () => {
    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const { POST } = await import('@/app/api/mcp/route')
      const request = new NextRequest('http://localhost:3000/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'tools/list', id: 1 }),
      })

      const response = await POST(request)
      expect(response.status).toBe(401)
    })

    it('should return 200 with valid session', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        expires: new Date(Date.now() + 3600000).toISOString(),
      })

      const mockServer = {
        setRequestHandler: vi.fn(),
      }
      mockGetOrCreateSessionServer.mockReturnValue(mockServer)
      mockGetSession.mockReturnValue(null)

      const { POST } = await import('@/app/api/mcp/route')
      const request = new NextRequest('http://localhost:3000/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'tools/list', id: 1 }),
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
    })

    it('should return proper JSON-RPC 2.0 response format', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        expires: new Date(Date.now() + 3600000).toISOString(),
      })

      const mockServer = {
        setRequestHandler: vi.fn(),
      }
      mockGetOrCreateSessionServer.mockReturnValue(mockServer)
      mockGetSession.mockReturnValue(null)
      const { POST } = await import('@/app/api/mcp/route')
      const request = new NextRequest('http://localhost:3000/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'tools/list', id: 1 }),
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
    })

    it('should return -32601 Method not found for invalid method', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        expires: new Date(Date.now() + 3600000).toISOString(),
      })

      const mockServer = {
        setRequestHandler: vi.fn(),
      }
      mockGetOrCreateSessionServer.mockReturnValue(mockServer)
      mockGetSession.mockReturnValue(null)
      const { POST } = await import('@/app/api/mcp/route')
      const request = new NextRequest('http://localhost:3000/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'invalid/unknown', id: 1 }),
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
    })

    it('should log audit for tool invocations', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        expires: new Date(Date.now() + 3600000).toISOString(),
      })

      const mockServer = {
        setRequestHandler: vi.fn(),
      }
      mockGetOrCreateSessionServer.mockReturnValue(mockServer)
      mockGetSession.mockReturnValue(null)
      const { POST } = await import('@/app/api/mcp/route')
      const request = new NextRequest('http://localhost:3000/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/call',
          params: { name: 'test-tool', arguments: {} },
          id: 1,
        }),
      })

      await POST(request)

      expect(mockLogAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'tool_invocation',
          resource: 'mcp_tool',
          resourceId: 'test-tool',
        })
      );
    })
  })

  describe('GET /api/mcp', () => {
    it('should return health check without authentication', async () => {
      const { GET } = await import('@/app/api/mcp/route')
      const request = new NextRequest('http://localhost:3000/api/mcp', {
        method: 'GET',
      })

      const response = await GET(request)
      expect(response.status).toBe(200)

      const body = await response.json()
      expect(body).toHaveProperty('status', 'ok')
      expect(body).toHaveProperty('version', '1.0.0')
    })
  })
});