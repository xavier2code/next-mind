/**
 * Tests for predefined Agent Cards
 *
 * Tests verify the four predefined agent cards:
 * - fileAgentCard
 * - searchAgentCard
 * - codeAgentCard
 * - customAgentCard
 */
import { describe, it, expect } from 'vitest';
import {
  fileAgentCard,
  searchAgentCard,
  codeAgentCard,
  customAgentCard,
} from '@/agents';
import type { AgentCard } from '@/lib/agents/types';

describe('Predefined Agent Cards', () => {
  describe('fileAgentCard', () => {
    it('should have id "file-agent" and type "file" skills', () => {
      // Test 1: fileAgentCard has id 'file-agent', type 'file', skillIds including 'file-read', 'file-list'
      expect(fileAgentCard.id).toBe('file-agent');
      expect(fileAgentCard.name).toBe('File Processing Agent');
      expect(fileAgentCard.description).toContain('file');
      expect(fileAgentCard.skillIds).toContain('file-read');
      expect(fileAgentCard.skillIds).toContain('file-list');
    });

    it('should have systemPrompt field with appropriate content', () => {
      // Test 5: Each agent has systemPrompt field with appropriate content
      expect(fileAgentCard.systemPrompt).toBeDefined();
      expect(fileAgentCard.systemPrompt).toContain('file');
      expect(fileAgentCard.systemPrompt).toContain('agent');
    });

    it('should have valid input and output schemas', () => {
      expect(fileAgentCard.inputSchema).toHaveProperty('task');
      expect(fileAgentCard.outputSchema).toHaveProperty('result');
      expect(fileAgentCard.outputSchema).toHaveProperty('summary');
    });
  });

  describe('searchAgentCard', () => {
    it('should have id "search-agent" and type "search" skills', () => {
      // Test 2: searchAgentCard has id 'search-agent', type 'search', skillIds including 'web-search'
      expect(searchAgentCard.id).toBe('search-agent');
      expect(searchAgentCard.name).toBe('Search Agent');
      expect(searchAgentCard.description).toContain('search');
      expect(searchAgentCard.skillIds).toContain('web-search');
    });

    it('should have systemPrompt field with appropriate content', () => {
      expect(searchAgentCard.systemPrompt).toBeDefined();
      expect(searchAgentCard.systemPrompt).toContain('search');
      expect(searchAgentCard.systemPrompt).toContain('agent');
    });

    it('should have valid input and output schemas', () => {
      expect(searchAgentCard.inputSchema).toHaveProperty('query');
      expect(searchAgentCard.outputSchema).toHaveProperty('results');
      expect(searchAgentCard.outputSchema).toHaveProperty('summary');
    });
  });

  describe('codeAgentCard', () => {
    it('should have id "code-agent" with empty skillIds (future)', () => {
      // Test 3: codeAgentCard has id 'code-agent', type 'code', empty skillIds (future)
      expect(codeAgentCard.id).toBe('code-agent');
      expect(codeAgentCard.name).toBe('Code Agent');
      expect(codeAgentCard.description).toContain('code');
      expect(codeAgentCard.skillIds).toEqual([]);
    });

    it('should have systemPrompt field with appropriate content', () => {
      expect(codeAgentCard.systemPrompt).toBeDefined();
      expect(codeAgentCard.systemPrompt).toContain('code');
      expect(codeAgentCard.systemPrompt).toContain('agent');
    });

    it('should have valid input and output schemas', () => {
      expect(codeAgentCard.inputSchema).toHaveProperty('task');
      expect(codeAgentCard.outputSchema).toHaveProperty('summary');
    });
  });

  describe('customAgentCard', () => {
    it('should have id "custom-agent" with empty skillIds', () => {
      // Test 4: customAgentCard has id 'custom-agent', type 'custom', empty skillIds
      expect(customAgentCard.id).toBe('custom-agent');
      expect(customAgentCard.name).toBe('Custom Agent');
      expect(customAgentCard.description).toContain('custom');
      expect(customAgentCard.skillIds).toEqual([]);
    });

    it('should have systemPrompt field with appropriate content', () => {
      expect(customAgentCard.systemPrompt).toBeDefined();
      expect(customAgentCard.systemPrompt).toContain('custom');
      expect(customAgentCard.systemPrompt).toContain('agent');
    });

    it('should have valid input and output schemas', () => {
      expect(customAgentCard.inputSchema).toHaveProperty('task');
      expect(customAgentCard.outputSchema).toHaveProperty('result');
      expect(customAgentCard.outputSchema).toHaveProperty('summary');
    });
  });

  describe('All Agent Cards', () => {
    it('should all be valid AgentCard objects', () => {
      const cards: AgentCard[] = [
        fileAgentCard,
        searchAgentCard,
        codeAgentCard,
        customAgentCard,
      ];

      for (const card of cards) {
        expect(card.id).toBeTruthy();
        expect(card.name).toBeTruthy();
        expect(card.description).toBeTruthy();
        expect(Array.isArray(card.skillIds)).toBe(true);
        expect(typeof card.inputSchema).toBe('object');
        expect(typeof card.outputSchema).toBe('object');
      }
    });

    it('should have unique IDs', () => {
      const ids = [
        fileAgentCard.id,
        searchAgentCard.id,
        codeAgentCard.id,
        customAgentCard.id,
      ];
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(4);
    });
  });
});
