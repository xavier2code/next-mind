/**
 * Code Agent Card
 *
 * Handles code generation, review, and refactoring tasks.
 * Skill IDs to be added in future phases (code-* skills).
 */
import { z } from 'zod';
import type { AgentCard } from '@/lib/agents/types';

export const codeAgentCard: AgentCard = {
  id: 'code-agent',
  name: 'Code Agent',
  description: 'Handles code generation, review, and refactoring tasks',
  skillIds: [], // Future: code-* skills
  inputSchema: {
    task: z.string().describe('The code task to perform'),
    language: z.string().optional(),
    context: z.record(z.unknown()).optional(),
  },
  outputSchema: {
    code: z.string().optional(),
    review: z.string().optional(),
    summary: z.string(),
  },
  systemPrompt: `You are a code agent. Your job is to generate, review, and refactor code. Follow best practices and write clean, maintainable code. Explain your changes clearly.`,
};
