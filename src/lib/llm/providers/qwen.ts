import type { Model } from '@mariozechner/pi-ai';

// Qwen via OpenAI-compatible API (Alibaba Cloud DashScope)
export const qwenModels: Record<string, Model<'openai-completions'>> = {
  'qwen3.5-turbo': {
    id: 'qwen3.5-turbo',
    name: 'Qwen 3.5 Turbo',
    api: 'openai-completions',
    provider: 'qwen',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    contextWindow: 128000,
    maxTokens: 8192,
    reasoning: false,
    cost: { input: 0.0003, output: 0.0006, cacheRead: 0, cacheWrite: 0 },
    input: ['text', 'image'],
    // Note: Qwen requires incremental_output: true for streaming
    // This is handled in the API call, not model config
  },
};

export function getQwenApiKey(): string {
  const key = process.env.QWEN_API_KEY;
  if (!key) {
    throw new Error('QWEN_API_KEY environment variable is not set');
  }
  return key;
}
