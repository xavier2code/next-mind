import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock next-auth at the top level
const mockAuth = vi.fn();
vi.mock('@/auth', () => ({
  auth: mockAuth,
}));

// Mock the MCP session module
const mockGetOrCreateSessionServer = vi.fn();
vi.mock('@/lib/mcp/session', () => ({
  getOrCreateSessionServer: mockGetOrCreateSessionServer,
  mcpSessionRegistry: new Map(),
}));

// Mock audit logging
const mockLogAudit = vi.fn();
vi.mock('@/lib/audit', () => ({
  logAudit: mockLogAudit,
  getClientInfo: vi.fn().mockReturnValue({ ipAddress: '127.0.0.1', userAgent: 'test-agent' }),
}));

// Mock monitoring
vi.mock('@/lib/monitoring', () => ({
  logger: {
    apiRequest: vi.fn(),
    apiResponse: vi.fn(),
    securityEvent: vi.fn(),
  },
  generateRequestId: vi.fn().mockReturnValue('req-test-123'),
}));

describe('MCP API Endpoint Authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/mcp', () => {
    it('should return 401 when not authenticated', async () => {
        mockAuth.mockResolvedValue(null);

        const { POST } = await import('@/app/api/mcp/route');
        const request = new NextRequest('http://localhost:3000/api/mcp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', method: 'tools/list', id: 1 }),
        });

        const response = await POST(request);
        expect(response.status).toBe(401);
      });

    it('should return 200 with valid session', async () => {
        mockAuth.mockResolvedValue({
          user: { id: 'user-123', email: 'test@example.com' },
          expires: new Date(Date.now() + 3600000).toISOString(),
        });

        const mockServer = {
          setRequestHandler: vi.fn(),
        };
        mockGetOrCreateSessionServer.mockReturnValue(mockServer);

        const { POST } = await import('@/app/api/mcp/route');
        const request = new NextRequest('http://localhost:3000/api/mcp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', method: 'tools/list', id: 1 }),
        });

        const response = await POST(request);
        expect(response.status).toBe(200);
      });

    it('should return proper JSON-RPC 2.0 response format', async () => {
        mockAuth.mockResolvedValue({
          user: { id: 'user-123', email: 'test@example.com' },
          expires: new Date(Date.now() + 3600000).toISOString(),
        });

        const mockServer = {
          setRequestHandler: vi.fn(),
        };
        mockGetOrCreateSessionServer.mockReturnValue(mockServer);

        const { POST } = await import('@/app/api/mcp/route');
        const request = new NextRequest('http://localhost:3000/api/mcp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', method: 'tools/list', id: 1 }),
        });

        const response = await POST(request);
        const body = await response.json();

        expect(body).toHaveProperty('jsonrpc', '2.0');
        expect(body).toHaveProperty('id', 1);
      });

    it('should return -32601 Method not found for invalid method', async () => {
        mockAuth.mockResolvedValue({
          user: { id: 'user-123', email: 'test@example.com' },
          expires: new Date(Date.now() + 3600000).toISOString(),
        });

        const mockServer = {
          setRequestHandler: vi.fn(),
        };
        mockGetOrCreateSessionServer.mockReturnValue(mockServer);

        const { POST } = await import('@/app/api/mcp/route');
        const request = new NextRequest('http://localhost:3000/api/mcp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', method: 'invalid/method', id: 1 }),
        });

        const response = await POST(request);
        const body = await response.json();

        expect(body).toHaveProperty('error');
        expect(body.error).toHaveProperty('code', -32601);
      });

    it('should log audit for tool invocations', async () => {
        mockAuth.mockResolvedValue({
          user: { id: 'user-123', email: 'test@example.com' },
          expires: new Date(Date.now() + 3600000).toISOString(),
        });

        const mockServer = {
          setRequestHandler: vi.fn(),
        };
        mockGetOrCreateSessionServer.mockReturnValue(mockServer);

        const { POST } = await import('@/app/api/mcp/route');
        const request = new NextRequest('http://localhost:3000/api/mcp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'tools/call',
            params: { name: 'test-tool', arguments: {} },
            id: 1,
          }),
        });

        await POST(request);

        expect(mockLogAudit).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'tool_invocation',
            resource: 'mcp_tool',
            resourceId: 'test-tool',
          })
        );
      });
  });

  describe('GET /api/mcp', () => {
    it('should return health check without authentication', async () => {
        const { GET } = await import('@/app/api/mcp/route');
        const request = new NextRequest('http://localhost:3000/api/mcp', {
          method: 'GET',
        });

        const response = await GET(request);
        expect(response.status).toBe(200);

        const body = await response.json();
        expect(body).toHaveProperty('status', 'ok');
        expect(body).toHaveProperty('version', '1.0.0');
      });
  });
});
