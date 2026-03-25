/**
 * Custom Agent Card
 *
 * User-defined specialized agent for custom tasks.
 * Configured by user with specific skill mappings.
 */
import { z } from 'zod';
import type { AgentCard } from '@/lib/agents/types';

export const customAgentCard: AgentCard = {
  id: 'custom-agent',
  name: 'Custom Agent',
  description: 'User-defined specialized agent for custom tasks',
  skillIds: [], // Configured by user
  inputSchema: {
    task: z.string().describe('The custom task to perform'),
    config: z.record(z.unknown()).optional(),
  },
  outputSchema: {
    result: z.unknown(),
    summary: z.string(),
  },
  systemPrompt: `You are a custom agent. Your behavior is defined by user configuration. Adapt to the specific task requirements while following general best practices.`,
};
