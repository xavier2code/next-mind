import 'reflect-metadata';
import { getSkillMetadata, SKILL_METADATA_KEY } from './decorator';
import type { SkillMetadata, SkillFunction, SkillCategory } from './types';

/**
 * Represents a discovered skill with its metadata and execute function
 */
export interface DiscoveredSkill {
  /** Skill metadata from the @skill decorator */
  metadata: SkillMetadata;
  /** The skill execution function */
  execute: SkillFunction;
  /** Source file where the skill is defined */
  sourceFile: string;
}

/**
 * Module-level cache for discovered skills
 */
let skillCache: Map<string, DiscoveredSkill> | null = null;

/**
 * Cached array of skills (to maintain reference equality)
 */
let skillArrayCache: DiscoveredSkill[] | null = null;

/**
 * Registry for explicitly registered skills
 */
const explicitRegistry: Map<string, DiscoveredSkill> = new Map();

/**
 * Register a skill explicitly.
 * This is the preferred way to register skills in ESM/Next.js environments.
 *
 * @param skill - The discovered skill to register
 */
export function registerSkill(skill: DiscoveredSkill): void {
  explicitRegistry.set(skill.metadata.id, skill);
  // Invalidate cache when a new skill is registered
  skillCache = null;
  skillArrayCache = null;
}

/**
 * Register multiple skills at once.
 *
 * @param skills - Array of discovered skills to register
 */
export function registerSkills(skills: DiscoveredSkill[]): void {
  for (const skill of skills) {
    explicitRegistry.set(skill.metadata.id, skill);
  }
  // Invalidate cache when skills are registered
  skillCache = null;
  skillArrayCache = null;
}

/**
 * Auto-discover skills from skill class instances.
 *
 * This function takes class instances exported from skill modules and
 * extracts decorated methods. In ESM environments, import the skill
 * modules and pass the instances to this function.
 *
 * @param modules - Object mapping module names to their exports
 * @returns Array of discovered skills
 *
 * @example
 * ```typescript
 * import { fileSkills } from '@/skills/file-processing';
 * import { dataSkills } from '@/skills/data-analysis';
 *
 * const skills = discoverSkillsFromModules({
 *   'file-processing.ts': fileSkills,
 *   'data-analysis.ts': dataSkills,
 * });
 * ```
 */
export function discoverSkillsFromModules(
  modules: Record<string, Record<string, unknown>>
): DiscoveredSkill[] {
  const skills: DiscoveredSkill[] = [];

  for (const [moduleName, exports] of Object.entries(modules)) {
    for (const exportName of Object.keys(exports)) {
      const exported = exports[exportName];

      // Check if it's an object (class instance) with decorated methods
      if (exported && typeof exported === 'object') {
        const prototype = Object.getPrototypeOf(exported);

        if (prototype && prototype.constructor !== Object) {
          // Get all method names from the prototype
          const methodNames = Object.getOwnPropertyNames(prototype).filter(
            (name) => name !== 'constructor' && typeof prototype[name] === 'function'
          );

          for (const methodName of methodNames) {
            // Check for skill metadata on the prototype (where decorators store it)
            const metadata = Reflect.getMetadata(SKILL_METADATA_KEY, prototype, methodName);

            if (metadata) {
              // Bind the method to the exported instance
              const boundMethod = (exported as Record<string, unknown>)[methodName];

              if (typeof boundMethod === 'function') {
                skills.push({
                  metadata: metadata as SkillMetadata,
                  execute: boundMethod.bind(exported) as SkillFunction,
                  sourceFile: moduleName,
                });
              }
            }
          }
        }
      }
    }
  }

  return skills;
}

/**
 * Discover all registered skills.
 *
 * Combines explicitly registered skills with auto-discovered skills
 * from the explicit registry.
 *
 * Results are cached for performance. Use clearCache() to reset.
 *
 * @returns Array of discovered skills with metadata and execute functions
 */
export function discoverSkills(): DiscoveredSkill[] {
  // Return cached array if available (maintains reference equality)
  if (skillArrayCache) {
    return skillArrayCache;
  }

  // Build cache map if needed
  if (!skillCache) {
    skillCache = new Map<string, DiscoveredSkill>();

    // Add all explicitly registered skills
    for (const [id, skill] of explicitRegistry) {
      skillCache.set(id, skill);
    }
  }

  // Create and cache the array
  skillArrayCache = Array.from(skillCache.values());
  return skillArrayCache;
}

/**
 * Get a specific skill by its ID.
 *
 * @param id - The skill ID to look up
 * @returns The discovered skill, or undefined if not found
 */
export function getSkillById(id: string): DiscoveredSkill | undefined {
  // Ensure cache is populated
  if (!skillCache) {
    discoverSkills();
  }

  return skillCache?.get(id);
}

/**
 * Get all skills in a specific category.
 *
 * @param category - The category to filter by
 * @returns Array of skills in the specified category
 */
export function getSkillsByCategory(category: SkillCategory): DiscoveredSkill[] {
  // Ensure cache is populated
  if (!skillCache) {
    discoverSkills();
  }

  return Array.from(skillCache?.values() ?? []).filter(
    (skill) => skill.metadata.category === category
  );
}

/**
 * Clear the skill discovery cache.
 *
 * Useful for testing or hot-reload scenarios.
 */
export function clearCache(): void {
  skillCache = null;
  skillArrayCache = null;
}

/**
 * Clear all registered skills (for testing).
 */
export function clearRegistry(): void {
  explicitRegistry.clear();
  skillCache = null;
  skillArrayCache = null;
}
