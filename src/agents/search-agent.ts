/**
 * Search Agent Card
 *
 * Executes web search and knowledge retrieval operations.
 * References existing web skill: web-search.
 */
import { z } from 'zod';
import type { AgentCard } from '@/lib/agents/types';

export const searchAgentCard: AgentCard = {
  id: 'search-agent',
  name: 'Search Agent',
  description: 'Executes web search and knowledge retrieval operations',
  skillIds: ['web-search'],
  inputSchema: {
    query: z.string().describe('The search query'),
    maxResults: z.number().max(10).default(5).optional(),
  },
  outputSchema: {
    results: z.array(z.unknown()),
    summary: z.string(),
  },
  systemPrompt: `You are a search agent. Your job is to find relevant information from the web and knowledge bases. Focus on accuracy and relevance. Summarize findings clearly.`,
};
