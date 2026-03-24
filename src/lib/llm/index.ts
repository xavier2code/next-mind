import { stream, type Model, type Context } from '@mariozechner/pi-ai';
import { qwenModels, getQwenApiKey } from './providers/qwen';
import { glmModels, getGlmApiKey } from './providers/glm';
import { minimaxModels, getMiniMaxApiKey } from './providers/minimax';
import { withRetry } from './retry';
import type { ModelConfig, ModelProvider } from '@/types';

// All available models
const allModels = {
  ...qwenModels,
  ...glmModels,
  ...minimaxModels,
};

// Get API key for provider
function getApiKey(provider: ModelProvider): string {
  switch (provider) {
    case 'qwen':
      return getQwenApiKey();
    case 'glm':
      return getGlmApiKey();
    case 'minimax':
      return getMiniMaxApiKey();
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

// Get model configuration by ID
export function getModel(modelId: string): Model<string> {
  const model = allModels[modelId];
  if (!model) {
    throw new Error(`Unknown model: ${modelId}`);
  }
  return model;
}

// Get model provider
export function getModelProvider(modelId: string): ModelProvider {
  if (modelId.startsWith('qwen')) return 'qwen';
  if (modelId.startsWith('glm')) return 'glm';
  if (modelId.startsWith('minimax')) return 'minimax';
  throw new Error(`Unknown model: ${modelId}`);
}

// List all available models
export function listModels(): ModelConfig[] {
  return Object.entries(allModels).map(([id, model]) => ({
    id,
    name: model.name,
    provider: getModelProvider(id),
    contextWindow: model.contextWindow,
    maxTokens: model.maxTokens,
  }));
}

// Stream chat completion with retry
export interface StreamChatOptions {
  modelId: string;
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  systemPrompt?: string;
}

export async function streamChat(options: StreamChatOptions) {
  const { modelId, messages, systemPrompt } = options;
  const model = getModel(modelId);
  const provider = getModelProvider(modelId);
  const apiKey = getApiKey(provider);

  // Convert messages to pi-ai format
  const piMessages = messages
    .filter(m => m.role !== 'system') // System prompt handled separately
    .map(m => ({
      role: m.role,
      content: m.content,
      timestamp: Date.now(),
    }));

  // Build context with system prompt
  const context: Context = {
    systemPrompt,
    messages: piMessages as Context['messages'],
  };

  // Use retry wrapper for API call
  return withRetry(async () => {
    const result = stream(model, context, {
      apiKey,
      // Provider-specific streaming params
      ...(provider === 'qwen' && {
        // Qwen requires this for character-by-character streaming
        extra: { incremental_output: true },
      }),
    });

    return result;
  });
}

// Re-export for convenience
export { qwenModels, glmModels, minimaxModels };
