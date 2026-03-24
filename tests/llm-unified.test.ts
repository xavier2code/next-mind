import { describe, it, expect } from 'vitest';
import { getModel, listModels, getModelProvider } from '@/lib/llm';

describe('Unified LLM Gateway', () => {
  describe('getModel', () => {
    it('returns Qwen model config', () => {
      const model = getModel('qwen3.5-turbo');
      expect(model.id).toBe('qwen3.5-turbo');
      expect(model.provider).toBe('qwen');
    });

    it('returns GLM model config', () => {
      const model = getModel('glm-4-flash');
      expect(model.id).toBe('glm-4-flash');
      expect(model.provider).toBe('glm');
    });

    it('returns MiniMax model config', () => {
      const model = getModel('minimax-m2.5');
      expect(model.id).toBe('minimax-m2.5');
      expect(model.provider).toBe('minimax');
    });

    it('throws for invalid model ID', () => {
      expect(() => getModel('invalid-model')).toThrow('Unknown model');
    });
  });

  describe('listModels', () => {
    it('returns all available models', () => {
      const models = listModels();
      expect(models.length).toBeGreaterThanOrEqual(3);
    });

    it('includes required model properties', () => {
      const models = listModels();
      models.forEach(model => {
        expect(model).toHaveProperty('id');
        expect(model).toHaveProperty('name');
        expect(model).toHaveProperty('provider');
        expect(model).toHaveProperty('contextWindow');
        expect(model).toHaveProperty('maxTokens');
      });
    });
  });

  describe('getModelProvider', () => {
    it('identifies Qwen provider', () => {
      expect(getModelProvider('qwen3.5-turbo')).toBe('qwen');
    });

    it('identifies GLM provider', () => {
      expect(getModelProvider('glm-4-flash')).toBe('glm');
    });

    it('identifies MiniMax provider', () => {
      expect(getModelProvider('minimax-m2.5')).toBe('minimax');
    });

    it('throws for unknown model', () => {
      expect(() => getModelProvider('unknown-model')).toThrow();
    });
  });
});
