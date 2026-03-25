import 'reflect-metadata';
import { z } from 'zod';
import type { McpTool, McpToolCallResult } from '../mcp/types';
import type { SkillMetadata, SkillContext, SkillResult, SkillFunction } from './types';

/**
 * Symbol key for storing skill metadata via reflect-metadata
 */
export const SKILL_METADATA_KEY = Symbol('skill:metadata');

/**
 * Semver version regex pattern (major.minor.patch)
 */
const SEMVER_REGEX = /^\d+\.\d+\.\d+$/;

/**
 * Validate that a version string is valid semver format
 */
function validateSemver(version: string): void {
  if (!SEMVER_REGEX.test(version)) {
    throw new Error(
      `Invalid semver version "${version}". Expected format: major.minor.patch (e.g., "1.0.0")`
    );
  }
}

/**
 * Method decorator that attaches skill metadata to a function.
 *
 * The metadata is stored using reflect-metadata and can be retrieved
 * using getSkillMetadata().
 *
 * @param metadata - The skill metadata to attach
 * @throws Error if version is not valid semver format
 *
 * @example
 * ```typescript
 * class FileSkills {
 *   @skill({
 *     id: 'file-read',
 *     name: 'Read File',
 *     description: 'Read content from a file',
 *     version: '1.0.0',
 *     category: 'file',
 *     tags: ['file', 'read'],
 *     inputSchema: { path: z.string() },
 *     requiresApproval: false,
 *     destructiveActions: [],
 *     dependencies: [],
 *     timeout: 10000,
 *   })
 *   async readFile(input: { path: string }, context: SkillContext): Promise<SkillResult> {
 *     // Implementation
 *   }
 * }
 * ```
 */
export function skill(metadata: SkillMetadata) {
  // Validate semver format at decoration time
  validateSemver(metadata.version);

  return function (
    target: object,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    // Store metadata using reflect-metadata
    Reflect.defineMetadata(SKILL_METADATA_KEY, metadata, target, propertyKey);

    // Return modified descriptor that wraps the original function
    const originalMethod = descriptor.value;

    descriptor.value = async function (
      this: unknown,
      ...args: Parameters<typeof originalMethod>
    ): Promise<SkillResult> {
      // If skill requires approval, the caller should handle approval flow
      // We just execute the skill - approval is handled externally
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Retrieve skill metadata from a decorated method.
 *
 * @param target - The class instance containing the decorated method
 * @param propertyKey - The name of the decorated method
 * @returns The skill metadata, or undefined if not decorated
 *
 * @example
 * ```typescript
 * const instance = new FileSkills();
 * const metadata = getSkillMetadata(instance, 'readFile');
 * console.log(metadata?.id); // 'file-read'
 * ```
 */
export function getSkillMetadata(
  target: object,
  propertyKey: string
): SkillMetadata | undefined {
  return Reflect.getMetadata(SKILL_METADATA_KEY, target, propertyKey);
}

/**
 * Convert a skill function to an MCP tool format.
 *
 * This enables skills to be registered with the MCP server and
 * invoked through the standard MCP protocol.
 *
 * @param skillFn - The decorated skill function (bound to its instance)
 * @param metadata - The skill metadata
 * @returns An McpTool ready for registration
 *
 * @example
 * ```typescript
 * const instance = new FileSkills();
 * const metadata = getSkillMetadata(instance, 'readFile');
 * const mcpTool = skillToMcpTool(instance.readFile.bind(instance), metadata!);
 * registry.registerTool(mcpTool);
 * ```
 */
export function skillToMcpTool(
  skillFn: SkillFunction,
  metadata: SkillMetadata
): McpTool {
  // Convert inputSchema record to a Zod object schema
  const inputSchema = z.object(
    metadata.inputSchema as Record<string, z.ZodTypeAny>
  );

  return {
    name: metadata.id,
    description: metadata.description,
    inputSchema,
    handler: async (args: unknown): Promise<McpToolCallResult> => {
      try {
        // Create a minimal context for MCP invocation
        // Real context should be provided by the caller
        const context: SkillContext = {
          userId: 'mcp-user',
          sessionId: 'mcp-session',
          previousResults: new Map(),
        };

        // Execute the skill
        const result = await skillFn(args, context);

        // Convert SkillResult to McpToolCallResult
        if (result.success) {
          return {
            content: [
              {
                type: 'text',
                text:
                  result.data !== undefined
                    ? JSON.stringify(result.data, null, 2)
                    : 'Success',
              },
            ],
            isError: false,
          };
        } else {
          return {
            content: [
              {
                type: 'text',
                text: result.error || 'Skill execution failed',
              },
            ],
            isError: true,
          };
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text:
                error instanceof Error ? error.message : 'Unknown error occurred',
            },
          ],
          isError: true,
        };
      }
    },
  };
}

// Re-export types for convenience
export type { SkillMetadata, SkillContext, SkillResult, SkillFunction } from './types';
