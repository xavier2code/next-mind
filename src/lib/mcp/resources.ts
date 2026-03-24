/**
 * MCP Resource Manager
 * Handles registration and reading of MCP resources
 * Resources can be file-based (file://) or data-based (data://)
 */

/**
 * Represents an MCP resource that can be read
 */
export interface McpResource {
  /** Unique URI for the resource (e.g., "file:///path/to/file", "data://session/info") */
  uri: string;
  /** Human-readable name for the resource */
  name: string;
  /** Description of what this resource provides */
  description: string;
  /** Optional MIME type of the resource content */
  mimeType?: string;
  /** Function to read the resource content */
  read(): Promise<string | Buffer>;
}

/**
 * Resource content returned by readResource
 */
export interface ResourceContent {
  uri: string;
  mimeType?: string;
  text?: string;
  blob?: string;
}

/**
 * Result of reading a resource
 */
export interface ReadResourceResult {
  contents: ResourceContent[];
}

/**
 * ResourceManager class
 * Manages registration, discovery, and reading of MCP resources
 */
export class ResourceManager {
  private resources: Map<string, McpResource> = new Map();

  /**
   * Register a resource with the manager
   * @throws Error if resource uri is duplicate
   */
  registerResource(resource: McpResource): void {
    if (this.resources.has(resource.uri)) {
      throw new Error(
        `Resource with uri "${resource.uri}" is already registered`
      );
    }
    this.resources.set(resource.uri, resource);
  }

  /**
   * List all registered resources
   * @returns Array of resource metadata without read function
   */
  listResources(): Array<{
    uri: string;
    name: string;
    description: string;
    mimeType?: string;
  }> {
    const result: Array<{
      uri: string;
      name: string;
      description: string;
      mimeType?: string;
    }> = [];

    for (const [, resource] of this.resources) {
      result.push({
        uri: resource.uri,
        name: resource.name,
        description: resource.description,
        mimeType: resource.mimeType,
      });
    }

    return result;
  }

  /**
   * Get a specific resource by uri
   * @returns The resource or undefined if not found
   */
  getResource(uri: string): McpResource | undefined {
    return this.resources.get(uri);
  }

  /**
   * Read a resource's content
   * @returns Resource content formatted for MCP response
   * @throws Error if resource not found
   */
  async readResource(uri: string): Promise<ReadResourceResult> {
    const resource = this.resources.get(uri);

    if (!resource) {
      throw new Error(`Resource with uri "${uri}" not found`);
    }

    const content = await resource.read();

    const resourceContent: ResourceContent = {
      uri: resource.uri,
      mimeType: resource.mimeType,
    };

    if (Buffer.isBuffer(content)) {
      resourceContent.blob = content.toString('base64');
    } else {
      resourceContent.text = content;
    }

    return {
      contents: [resourceContent],
    };
  }
}

/**
 * Create a new ResourceManager instance
 * Use this for session-scoped resource managers
 */
export function createResourceManager(): ResourceManager {
  return new ResourceManager();
}

/**
 * Global singleton resource manager for built-in resources
 * Session-scoped managers should use createResourceManager()
 */
export const resourceManager = createResourceManager();

/**
 * Initialize built-in resources
 * Called at application startup
 */
export function initializeBuiltinResources(
  getSessionInfo: () => { userId: string; createdAt: Date },
  getToolsList: () => Array<{ name: string; description: string }>
): void {
  // Session info resource
  resourceManager.registerResource({
    uri: 'data://session/info',
    name: 'Session Info',
    description: 'Current session metadata including userId and createdAt',
    mimeType: 'application/json',
    read: async () => {
      return JSON.stringify(getSessionInfo());
    },
  });

  // Tools list resource
  resourceManager.registerResource({
    uri: 'data://tools/list',
    name: 'Tools List',
    description: 'List of available MCP tools',
    mimeType: 'application/json',
    read: async () => {
      return JSON.stringify(getToolsList());
    },
  });
}
