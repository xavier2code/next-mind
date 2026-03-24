export interface StateMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ConversationState {
  version: number;
  conversationId: string;
  userId: string;
  modelId: string;
  messages: StateMessage[];
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

const CURRENT_VERSION = 1;

export interface CreateStateOptions {
  conversationId: string;
  userId: string;
  modelId: string;
  messages?: StateMessage[];
  metadata?: Record<string, unknown>;
}

export function createConversationState(options: CreateStateOptions): ConversationState {
  if (!options.conversationId) {
    throw new Error('conversationId is required');
  }
  if (!options.userId) {
    throw new Error('userId is required');
  }
  if (!options.modelId) {
    throw new Error('modelId is required');
  }

  const now = new Date();

  return {
    version: CURRENT_VERSION,
    conversationId: options.conversationId,
    userId: options.userId,
    modelId: options.modelId,
    messages: options.messages || [],
    createdAt: now,
    updatedAt: now,
    metadata: options.metadata,
  };
}

export function serializeState(state: ConversationState): string {
  return JSON.stringify({
    ...state,
    createdAt: state.createdAt.toISOString(),
    updatedAt: state.updatedAt.toISOString(),
  });
}

export function deserializeState(json: string): ConversationState {
  const parsed = JSON.parse(json);

  return {
    ...parsed,
    createdAt: new Date(parsed.createdAt),
    updatedAt: new Date(parsed.updatedAt),
  };
}

// Helper to update state with new message
export function addMessageToState(
  state: ConversationState,
  message: StateMessage
): ConversationState {
  return {
    ...state,
    messages: [...state.messages, message],
    updatedAt: new Date(),
  };
}

// Helper to update state's model
export function updateStateModel(
  state: ConversationState,
  modelId: string
): ConversationState {
  return {
    ...state,
    modelId,
    updatedAt: new Date(),
  };
}
