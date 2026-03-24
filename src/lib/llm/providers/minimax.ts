import type { Model } from '@mariozechner/pi-ai';

// MiniMax uses OpenAI-compatible API
export const minimaxModels: Record<string, Model<'openai-completions'>> = {
  'minimax-m2.5': {
    id: 'minimax-m2.5',
    name: 'MiniMax M2.5',
    api: 'openai-completions',
    provider: 'minimax',
    baseUrl: 'https://api.minimax.chat/v1',
    contextWindow: 128000,
    maxTokens: 8192,
    reasoning: false,
    cost: { input: 0.0003, output: 0.0006, cacheRead: 0, cacheWrite: 0 },
    input: ['text'],
  },
};

export function getMiniMaxApiKey(): string {
  const key = process.env.MINIMAX_API_KEY;
  if (!key) {
    throw new Error('MINIMAX_API_KEY environment variable is not set');
  }
  return key;
}
