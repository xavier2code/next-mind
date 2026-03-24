// LLM Model types
export type ModelProvider = 'qwen' | 'glm' | 'minimax';

export interface ModelConfig {
  id: string;
  name: string;
  provider: ModelProvider;
  contextWindow: number;
  maxTokens: number;
}

export const AVAILABLE_MODELS: ModelConfig[] = [
  {
    id: 'qwen3.5-turbo',
    name: 'Qwen 3.5 Turbo',
    provider: 'qwen',
    contextWindow: 128000,
    maxTokens: 8192,
  },
  {
    id: 'glm-4-flash',
    name: 'GLM-4 Flash',
    provider: 'glm',
    contextWindow: 128000,
    maxTokens: 4096,
  },
  {
    id: 'minimax-m2.5',
    name: 'MiniMax M2.5',
    provider: 'minimax',
    contextWindow: 128000,
    maxTokens: 8192,
  },
];

// Chat message types (compatible with Vercel AI SDK)
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt?: Date;
}

// API response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// Audit log action types
export type AuditAction =
  | 'user_login'
  | 'user_logout'
  | 'chat_message'
  | 'conversation_create'
  | 'conversation_delete'
  | 'model_switch'
  | 'tool_invocation'
  | 'tool_approval'
  | 'tool_rejection';
