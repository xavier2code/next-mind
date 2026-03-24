import type { Model } from '@mariozechner/pi-ai';

// GLM via OpenAI-compatible API (Zhipu AI)
export const glmModels: Record<string, Model<'openai-completions'>> = {
  'glm-4-flash': {
    id: 'glm-4-flash',
    name: 'GLM-4 Flash',
    api: 'openai-completions',
    provider: 'glm',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    contextWindow: 128000,
    maxTokens: 4096,
    reasoning: false,
    cost: { input: 0.0001, output: 0.0001, cacheRead: 0, cacheWrite: 0 },
    input: ['text'],
  },
};

export function getGlmApiKey(): string {
  const key = process.env.GLM_API_KEY;
  if (!key) {
    throw new Error('GLM_API_KEY environment variable is not set');
  }
  return key;
}
