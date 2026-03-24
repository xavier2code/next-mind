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
}));

// Mock audit logging - must return a resolved promise for .catch() to work
const mockLogAudit = vi.fn().mockResolvedValue(undefined);
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
    error: vi.fn(),
  },
  generateRequestId: vi.fn().mockReturnValue('req-test-123'),
}));

// Mock resources module - use a shared map to persist resources across calls
const sharedResources = new Map<string, object>();
let resourceManagerInstance: any = null;

vi.mock('@/lib/mcp/resources', () => ({
  createResourceManager: () => {
    if (!resourceManagerInstance) {
      resourceManagerInstance = {
        registerResource: (resource: { uri: string }) => {
          if (sharedResources.has(resource.uri)) {
            throw new Error(`Resource with uri "${resource.uri}" is already registered`);
          }
          sharedResources.set(resource.uri, resource);
        },
        listResources: () => Array.from(sharedResources.values()).map((r: any) => ({
          uri: r.uri,
          name: r.name,
          description: r.description,
          mimeType: r.mimeType,
        })),
        getResource: (uri: string) => sharedResources.get(uri),
        readResource: async (uri: string) => {
          const resource = sharedResources.get(uri) as any;
          if (!resource) {
            throw new Error(`Resource with uri "${uri}" not found`);
          }
          const content = await resource.read();
          return {
            contents: [{
              uri: resource.uri,
              mimeType: resource.mimeType,
              text: content,
            }],
          };
        },
      };
    }
    return resourceManagerInstance;
  },
}));

// Mock prompts module
vi.mock('@/lib/mcp/prompts', () => {
  const prompts = new Map<string, object>();

  const builtinPrompts = [
    {
      name: 'analyze-data',
      description: 'Prompt for data analysis tasks',
      arguments: [
        { name: 'dataType', description: 'Type of data to analyze', required: true },
        { name: 'goal', description: 'Analysis goal or objective', required: true },
      ],
      render: async (args: Record<string, string>) => ({
        description: `Analyze ${args.dataType}`,
        messages: [{
          role: 'user',
          content: { type: 'text', text: `Please analyze the following ${args.dataType} with the goal of ${args.goal}. Provide insights, patterns, and recommendations based on your analysis.` },
        }],
      }),
    },
    {
      name: 'summarize',
      description: 'Prompt for summarization tasks',
      arguments: [
        { name: 'content', description: 'Content to summarize', required: true },
        { name: 'format', description: 'Output format (paragraph, bullets, executive)', required: false },
      ],
      render: async (args: Record<string, string>) => ({
        description: 'Summarize content',
        messages: [{
          role: 'user',
          content: { type: 'text', text: `Please summarize the following content.\n\nContent:\n${args.content}` },
        }],
      }),
    },
    {
      name: 'code-review',
      description: 'Prompt for code review',
      arguments: [
        { name: 'language', description: 'Programming language', required: true },
        { name: 'code', description: 'Code to review', required: true },
      ],
      render: async (args: Record<string, string>) => ({
        description: `Review ${args.language} code`,
        messages: [{
          role: 'user',
          content: { type: 'text', text: `Please review the following ${args.language} code.\n\nCode:\n\`\`\`${args.language}\n${args.code}\n\`\`\`` },
        }],
      }),
    },
  ];

  return {
    createPromptManager: (options?: { includeBuiltins?: boolean }) => {
      if (options?.includeBuiltins) {
        for (const prompt of builtinPrompts) {
          prompts.set(prompt.name, prompt);
        }
      }

      return {
        registerPrompt: (prompt: { name: string }) => {
          if (prompts.has(prompt.name)) {
            throw new Error(`Prompt with name "${prompt.name}" is already registered`);
          }
          prompts.set(prompt.name, prompt);
        },
        listPrompts: () => Array.from(prompts.values()).map((p: any) => ({
          name: p.name,
          description: p.description,
          arguments: p.arguments,
        })),
        getPrompt: async (name: string, args: Record<string, string>) => {
          const prompt = prompts.get(name) as any;
          if (!prompt) {
            throw new Error(`Prompt with name "${name}" not found`);
          }
          // Validate required arguments
          for (const arg of prompt.arguments) {
            if (arg.required && !(arg.name in args)) {
              throw new Error(`Missing required argument: ${arg.name}`);
            }
          }
          return prompt.render(args);
        },
      };
    },
  };
});

describe('MCP API Resources and Prompts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com' },
      expires: new Date(Date.now() + 3600000).toISOString(),
    });

    const mockServer = {
      setRequestHandler: vi.fn(),
    };
    mockGetOrCreateSessionServer.mockReturnValue(mockServer);
  });

  describe('resources/list', () => {
    it('should return list of available resources', async () => {
      const { POST } = await import('@/app/api/mcp/route');
      const request = new NextRequest('http://localhost:3000/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'resources/list', id: 1 }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.jsonrpc).toBe('2.0');
      expect(body.id).toBe(1);
      expect(body.result).toHaveProperty('resources');
      expect(Array.isArray(body.result.resources)).toBe(true);
    });

    it('should include session info resource', async () => {
      const { POST } = await import('@/app/api/mcp/route');
      const request = new NextRequest('http://localhost:3000/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'resources/list', id: 1 }),
      });

      const response = await POST(request);
      const body = await response.json();

      const sessionResource = body.result.resources.find(
        (r: { uri: string }) => r.uri === 'data://session/info'
      );
      expect(sessionResource).toBeDefined();
      expect(sessionResource.name).toBe('Session Info');
    });
  });

  describe('resources/read', () => {
    it('should return resource content for valid uri', async () => {
      const { POST } = await import('@/app/api/mcp/route');
      const request = new NextRequest('http://localhost:3000/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'resources/read',
          params: { uri: 'data://session/info' },
          id: 2,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const body = await response.json();
      console.log('Response body:', JSON.stringify(body, null, 2));
      expect(body.jsonrpc).toBe('2.0');
      expect(body.id).toBe(2);
      expect(body.result).toHaveProperty('contents');
      expect(Array.isArray(body.result.contents)).toBe(true);
      expect(body.result.contents[0]).toHaveProperty('uri', 'data://session/info');
      expect(body.result.contents[0]).toHaveProperty('text');
    });

    it('should return error for invalid uri', async () => {
      const { POST } = await import('@/app/api/mcp/route');
      const request = new NextRequest('http://localhost:3000/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'resources/read',
          params: { uri: 'invalid://unknown' },
          id: 3,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('code', -32602);
      expect(body.error.message).toContain('Invalid params');
    });

    it('should log audit for resource reads', async () => {
      const { POST } = await import('@/app/api/mcp/route');
      const request = new NextRequest('http://localhost:3000/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'resources/read',
          params: { uri: 'data://session/info' },
          id: 4,
        }),
      });

      await POST(request);

      expect(mockLogAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'resource_read',
          resource: 'mcp_resource',
          resourceId: 'data://session/info',
        })
      );
    });
  });

  describe('prompts/list', () => {
    it('should return list of available prompts', async () => {
      const { POST } = await import('@/app/api/mcp/route');
      const request = new NextRequest('http://localhost:3000/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'prompts/list', id: 5 }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.jsonrpc).toBe('2.0');
      expect(body.id).toBe(5);
      expect(body.result).toHaveProperty('prompts');
      expect(Array.isArray(body.result.prompts)).toBe(true);
    });

    it('should include built-in prompts', async () => {
      const { POST } = await import('@/app/api/mcp/route');
      const request = new NextRequest('http://localhost:3000/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'prompts/list', id: 6 }),
      });

      const response = await POST(request);
      const body = await response.json();

      const promptNames = body.result.prompts.map((p: { name: string }) => p.name);
      expect(promptNames).toContain('analyze-data');
      expect(promptNames).toContain('summarize');
      expect(promptNames).toContain('code-review');
    });
  });

  describe('prompts/get', () => {
    it('should return rendered prompt with valid name and args', async () => {
      const { POST } = await import('@/app/api/mcp/route');
      const request = new NextRequest('http://localhost:3000/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'prompts/get',
          params: {
            name: 'analyze-data',
            arguments: { dataType: 'sales data', goal: 'find trends' },
          },
          id: 7,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.jsonrpc).toBe('2.0');
      expect(body.id).toBe(7);
      expect(body.result).toHaveProperty('messages');
      expect(Array.isArray(body.result.messages)).toBe(true);
      expect(body.result.messages[0].content.text).toContain('sales data');
      expect(body.result.messages[0].content.text).toContain('find trends');
    });

    it('should return error for missing required args', async () => {
      const { POST } = await import('@/app/api/mcp/route');
      const request = new NextRequest('http://localhost:3000/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'prompts/get',
          params: {
            name: 'analyze-data',
            arguments: { dataType: 'sales data' }, // missing 'goal'
          },
          id: 8,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('code', -32602);
      expect(body.error.message).toContain('Invalid params');
    });

    it('should return error for unknown prompt name', async () => {
      const { POST } = await import('@/app/api/mcp/route');
      const request = new NextRequest('http://localhost:3000/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'prompts/get',
          params: { name: 'unknown-prompt', arguments: {} },
          id: 9,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('code', -32601);
      expect(body.error.message).toContain('Method not found');
    });

    it('should log audit for prompt gets', async () => {
      const { POST } = await import('@/app/api/mcp/route');
      const request = new NextRequest('http://localhost:3000/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'prompts/get',
          params: {
            name: 'summarize',
            arguments: { content: 'test content' },
          },
          id: 10,
        }),
      });

      await POST(request);

      expect(mockLogAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'prompt_get',
          resource: 'mcp_prompt',
          resourceId: 'summarize',
        })
      );
    });
  });
});
