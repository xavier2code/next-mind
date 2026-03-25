/**
 * File Processing Agent Card
 *
 * Handles PDF, Word, image, and code file operations.
 * References existing file skills: file-read, file-list.
 */
import { z } from 'zod';
import type { AgentCard } from '@/lib/agents/types';

export const fileAgentCard: AgentCard = {
  id: 'file-agent',
  name: 'File Processing Agent',
  description: 'Handles PDF, Word, image, and code file operations',
  skillIds: ['file-read', 'file-list'],
  inputSchema: {
    task: z.string().describe('The file operation task to perform'),
    context: z.record(z.unknown()).optional(),
  },
  outputSchema: {
    result: z.unknown(),
    summary: z.string(),
  },
  systemPrompt: `You are a file processing agent. Your job is to handle file operations including reading files, listing directories, and processing documents. Always verify file paths exist before operating. Report clear errors with file paths.`,
};
