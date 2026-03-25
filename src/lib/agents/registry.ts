/**
 * Agent Registry
 *
 * Central registry for agent types. Validates skill references
 * at registration time and provides lookup methods.
 */
import 'reflect-metadata';
import type { AgentCard, AgentType, RegisteredAgent } from './types';
import type { DiscoveredSkill } from '@/lib/skills/discovery';
import { getSkillById } from '@/lib/skills/discovery';

/**
 * AgentRegistry class
 *
 * Manages registration and lookup of agent types.
 * Validates that all skillIds reference existing skills at registration time.
 */
export class AgentRegistry {
  private agents: Map<string, RegisteredAgent> = new Map();

  /**
   * Register an agent card with its type.
   *
   * Validates that all skillIds in the card reference existing skills
   * in the SkillRegistry. Throws an error if any skill is not found.
   *
   * @param card - The agent card definition
   * @param type - The agent type classification
   * @throws Error if any skillId references an unknown skill
   */
  register(card: AgentCard, type: AgentType): void {
    const resolvedSkills: DiscoveredSkill[] = [];

    // Validate each skillId exists
    for (const skillId of card.skillIds) {
      const skill = getSkillById(skillId);
      if (!skill) {
        throw new Error(
          `Agent "${card.id}" references unknown skill: ${skillId}`
        );
      }
      resolvedSkills.push(skill);
    }

    // Store the registered agent with resolved skills
    const registeredAgent: RegisteredAgent = {
      card,
      type,
      skills: resolvedSkills,
    };

    this.agents.set(card.id, registeredAgent);
  }

  /**
   * Get a registered agent by its ID.
   *
   * @param id - The agent ID to look up
   * @returns The registered agent, or undefined if not found
   */
  get(id: string): RegisteredAgent | undefined {
    return this.agents.get(id);
  }

  /**
   * Get all registered agents of a specific type.
   *
   * @param type - The agent type to filter by
   * @returns Array of agents matching the type
   */
  getByType(type: AgentType): RegisteredAgent[] {
    return Array.from(this.agents.values()).filter(
      (agent) => agent.type === type
    );
  }

  /**
   * Get all registered agents.
   *
   * @returns Array of all registered agents
   */
  getAll(): RegisteredAgent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Clear all registered agents.
   *
   * Useful for testing or resetting the registry.
   */
  clear(): void {
    this.agents.clear();
  }
}

/**
 * Singleton instance of the AgentRegistry.
 *
 * Use this for application-wide agent registration and lookup.
 */
export const agentRegistry = new AgentRegistry();
