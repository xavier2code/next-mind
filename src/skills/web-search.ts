import 'reflect-metadata';
import { z } from 'zod';
import { skill, getSkillMetadata } from '@/lib/skills/decorator';
import type { SkillMetadata, SkillContext, SkillResult } from '@/lib/skills/types';

/**
 * WebSearchSkills class with web search skills
 */
export class WebSearchSkills {
  /**
   * Search the web for information
   */
  @skill({
    id: 'web-search',
    name: 'Web Search',
    description: 'Search the web for information',
    version: '1.0.0',
    category: 'web',
    tags: ['web', 'search', 'information'],
    inputSchema: {
      query: z.string(),
      maxResults: z.number().max(10).default(5),
    },
    requiresApproval: false,
    destructiveActions: [],
    dependencies: [],
    timeout: 15000,
  })
  async searchWeb(
    input: { query: string; maxResults?: number },
    context: SkillContext
  ): Promise<SkillResult> {
    try {
      // Mock implementation - in a real implementation, this would call an external search API
      // For now, return mock results
      const maxResults = input.maxResults ?? 5;
      const mockResults = [
        {
          title: `Search results for "${input.query}"`,
          url: `https://example.com/search?q=${encodeURIComponent(input.query)}`,
          snippet: `This is a mock search result for the query: "${input.query}"...`,
        },
        {
          title: `Result 2 for "${input.query}"`,
          url: `https://example.org/search?q=${encodeURIComponent(input.query)}`,
          snippet: `More information about "${input.query}" can be found here.`,
        },
        {
          title: `Result 3 for "${input.query}"`,
          url: `https://example.net/search?q=${encodeURIComponent(input.query)}`,
          snippet: `Additional resources for "${input.query}" are listed below.`,
        },
      ];

      const limitedResults = mockResults.slice(0, maxResults);

      return { success: true, data: limitedResults };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

export const webSkills = new WebSearchSkills();
