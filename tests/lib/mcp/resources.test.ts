import { describe, it, expect, beforeEach } from 'vitest';
import {
  ResourceManager,
  createResourceManager,
  type McpResource,
} from '@/lib/mcp/resources';

describe('ResourceManager', () => {
  let manager: ResourceManager;

  beforeEach(() => {
    manager = createResourceManager();
  });

  describe('registerResource', () => {
    it('should register a resource to the manager', () => {
      const resource: McpResource = {
        uri: 'test://resource/1',
        name: 'Test Resource',
        description: 'A test resource',
        read: async () => 'test content',
      };

      manager.registerResource(resource);

      const retrieved = manager.getResource('test://resource/1');
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Test Resource');
    });

    it('should throw error when registering duplicate uri', () => {
      const resource1: McpResource = {
        uri: 'test://resource/dup',
        name: 'Resource 1',
        description: 'First resource',
        read: async () => 'content 1',
      };

      const resource2: McpResource = {
        uri: 'test://resource/dup',
        name: 'Resource 2',
        description: 'Second resource',
        read: async () => 'content 2',
      };

      manager.registerResource(resource1);
      expect(() => manager.registerResource(resource2)).toThrow(
        'Resource with uri "test://resource/dup" is already registered'
      );
    });
  });

  describe('listResources', () => {
    it('should return all resources with uri, name, description, mimeType', () => {
      const resource1: McpResource = {
        uri: 'file:///path/to/file1',
        name: 'File 1',
        description: 'First file',
        mimeType: 'text/plain',
        read: async () => 'content 1',
      };

      const resource2: McpResource = {
        uri: 'data://session/info',
        name: 'Session Info',
        description: 'Current session information',
        read: async () => JSON.stringify({ userId: 'test' }),
      };

      manager.registerResource(resource1);
      manager.registerResource(resource2);

      const list = manager.listResources();

      expect(list).toHaveLength(2);
      expect(list).toContainEqual({
        uri: 'file:///path/to/file1',
        name: 'File 1',
        description: 'First file',
        mimeType: 'text/plain',
      });
      expect(list).toContainEqual({
        uri: 'data://session/info',
        name: 'Session Info',
        description: 'Current session information',
        mimeType: undefined,
      });
    });

    it('should return empty array when no resources registered', () => {
      const list = manager.listResources();
      expect(list).toEqual([]);
    });
  });

  describe('getResource', () => {
    it('should return specific resource by uri', () => {
      const resource: McpResource = {
        uri: 'test://specific',
        name: 'Specific Resource',
        description: 'A specific resource',
        read: async () => 'specific content',
      };

      manager.registerResource(resource);

      const retrieved = manager.getResource('test://specific');
      expect(retrieved).toBe(resource);
    });

    it('should return undefined for unknown uri', () => {
      const retrieved = manager.getResource('unknown://uri');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('readResource', () => {
    it('should return resource content as text', async () => {
      const resource: McpResource = {
        uri: 'test://text-content',
        name: 'Text Resource',
        description: 'Returns text content',
        mimeType: 'text/plain',
        read: async () => 'Hello, World!',
      };

      manager.registerResource(resource);

      const result = await manager.readResource('test://text-content');

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0]).toEqual({
        uri: 'test://text-content',
        mimeType: 'text/plain',
        text: 'Hello, World!',
      });
    });

    it('should return resource content as base64 blob for Buffer', async () => {
      const bufferContent = Buffer.from('Binary content');
      const resource: McpResource = {
        uri: 'test://binary-content',
        name: 'Binary Resource',
        description: 'Returns binary content',
        mimeType: 'application/octet-stream',
        read: async () => bufferContent,
      };

      manager.registerResource(resource);

      const result = await manager.readResource('test://binary-content');

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0]).toEqual({
        uri: 'test://binary-content',
        mimeType: 'application/octet-stream',
        blob: bufferContent.toString('base64'),
      });
    });

    it('should throw error for unknown uri', async () => {
      await expect(manager.readResource('unknown://uri')).rejects.toThrow(
        'Resource with uri "unknown://uri" not found'
      );
    });
  });

  describe('Resource Types', () => {
    it('should support file-based resources', async () => {
      const fileResource: McpResource = {
        uri: 'file:///documents/report.txt',
        name: 'Report',
        description: 'Annual report document',
        mimeType: 'text/plain',
        read: async () => 'Report content here',
      };

      manager.registerResource(fileResource);

      const result = await manager.readResource('file:///documents/report.txt');
      expect(result.contents[0].text).toBe('Report content here');
    });

    it('should support data-based (in-memory) resources', async () => {
      const dataResource: McpResource = {
        uri: 'data://metrics/summary',
        name: 'Metrics Summary',
        description: 'In-memory metrics data',
        mimeType: 'application/json',
        read: async () => JSON.stringify({ clicks: 100, views: 500 }),
      };

      manager.registerResource(dataResource);

      const result = await manager.readResource('data://metrics/summary');
      expect(result.contents[0].text).toBe(
        JSON.stringify({ clicks: 100, views: 500 })
      );
    });
  });
});
