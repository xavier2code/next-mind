/**
 * Central skill registry
 *
 * This module imports all skill modules and registers them with the discovery system.
 * It provides a single entry point for skill discovery in ESM environments.
 */

import 'reflect-metadata';
import {
  discoverSkillsFromModules,
  registerSkills,
  discoverSkills,
  getSkillById,
  getSkillsByCategory,
  clearCache,
  clearRegistry,
  type DiscoveredSkill,
} from './discovery';

// Import all skill modules
import { fileSkills } from '@/skills/file-processing';
import { dataSkills } from '@/skills/data-analysis';
import { webSkills } from '@/skills/web-search';

// Re-export discovery functions
export {
  discoverSkills,
  getSkillById,
  getSkillsByCategory,
  clearCache,
  clearRegistry,
  registerSkills,
  registerSkill,
  type DiscoveredSkill,
};

/**
 * Initialize the skill registry by discovering skills from all imported modules.
 *
 * This should be called at application startup.
 */
export function initializeSkillRegistry(): DiscoveredSkill[] {
  // Discover skills from all imported modules
  const skills = discoverSkillsFromModules({
    'file-processing.ts': { fileSkills },
    'data-analysis.ts': { dataSkills },
    'web-search.ts': { webSkills },
  });

  // Register all discovered skills
  registerSkills(skills);

  return skills;
}

/**
 * Check if the registry has been initialized.
 */
let initialized = false;

/**
 * Reset the initialization flag (for testing).
 */
export function resetInitialized(): void {
  initialized = false;
}

/**
 * Get all skills, initializing the registry if needed.
 */
export function getAllSkills(): DiscoveredSkill[] {
  if (!initialized) {
    initializeSkillRegistry();
    initialized = true;
  }
  return discoverSkills();
}

/**
 * Get a skill by ID, initializing the registry if needed.
 */
export function getSkill(skillId: string): DiscoveredSkill | undefined {
  if (!initialized) {
    initializeSkillRegistry();
    initialized = true;
  }
  return getSkillById(skillId);
}
