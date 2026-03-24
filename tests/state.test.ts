import { describe, it, expect } from 'vitest';
import {
  ConversationState,
  createConversationState,
  serializeState,
  deserializeState,
  addMessageToState,
  updateStateModel,
} from '@/lib/state';

describe('Conversation State', () => {
  it('creates state with required fields', () => {
    const state = createConversationState({
      conversationId: 'conv-123',
      userId: 'user-456',
      modelId: 'qwen3.5-turbo',
    });

    expect(state.conversationId).toBe('conv-123');
    expect(state.userId).toBe('user-456');
    expect(state.modelId).toBe('qwen3.5-turbo');
    expect(state.messages).toEqual([]);
    expect(state.createdAt).toBeInstanceOf(Date);
    expect(state.updatedAt).toBeInstanceOf(Date);
  });

  it('serializes state to JSON', () => {
    const state = createConversationState({
      conversationId: 'conv-123',
      userId: 'user-456',
      modelId: 'qwen3.5-turbo',
    });

    const json = serializeState(state);

    expect(typeof json).toBe('string');
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('deserializes state from JSON', () => {
    const original = createConversationState({
      conversationId: 'conv-123',
      userId: 'user-456',
      modelId: 'qwen3.5-turbo',
    });

    const json = serializeState(original);
    const restored = deserializeState(json);

    expect(restored.conversationId).toBe(original.conversationId);
    expect(restored.userId).toBe(original.userId);
    expect(restored.modelId).toBe(original.modelId);
  });

  it('includes messages in state', () => {
    const state = createConversationState({
      conversationId: 'conv-123',
      userId: 'user-456',
      modelId: 'qwen3.5-turbo',
      messages: [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
      ],
    });

    expect(state.messages.length).toBe(2);
    expect(state.messages[0].role).toBe('user');
    expect(state.messages[1].role).toBe('assistant');
  });

  it('validates required fields', () => {
    expect(() =>
      createConversationState({
        conversationId: '',
        userId: 'user-456',
        modelId: 'qwen3.5-turbo',
      })
    ).toThrow('conversationId is required');
  });

  it('tracks state version for migrations', () => {
    const state = createConversationState({
      conversationId: 'conv-123',
      userId: 'user-456',
      modelId: 'qwen3.5-turbo',
    });

    expect(state.version).toBeDefined();
    expect(typeof state.version).toBe('number');
  });

  it('validates userId is required', () => {
    expect(() =>
      createConversationState({
        conversationId: 'conv-123',
        userId: '',
        modelId: 'qwen3.5-turbo',
      })
    ).toThrow('userId is required');
  });

  it('validates modelId is required', () => {
    expect(() =>
      createConversationState({
        conversationId: 'conv-123',
        userId: 'user-456',
        modelId: '',
      })
    ).toThrow('modelId is required');
  });
});

describe('addMessageToState', () => {
  it('adds message to state and updates timestamp', () => {
    const state = createConversationState({
      conversationId: 'conv-123',
      userId: 'user-456',
      modelId: 'qwen3.5-turbo',
    });

    const originalUpdatedAt = state.updatedAt;
    // Wait a tiny bit to ensure different timestamp
    const newState = addMessageToState(state, { role: 'user', content: 'Hello' });

    expect(newState.messages.length).toBe(1);
    expect(newState.messages[0].content).toBe('Hello');
    expect(newState.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    // Original state unchanged (immutability)
    expect(state.messages.length).toBe(0);
  });
});

describe('updateStateModel', () => {
  it('updates model ID and timestamp', () => {
    const state = createConversationState({
      conversationId: 'conv-123',
      userId: 'user-456',
      modelId: 'qwen3.5-turbo',
    });

    const newState = updateStateModel(state, 'glm-4-flash');

    expect(newState.modelId).toBe('glm-4-flash');
    expect(newState.updatedAt.getTime()).toBeGreaterThanOrEqual(state.updatedAt.getTime());
    // Original state unchanged
    expect(state.modelId).toBe('qwen3.5-turbo');
  });
});

describe('serialization roundtrip', () => {
  it('preserves all data through serialize/deserialize', () => {
    const original = createConversationState({
      conversationId: 'conv-123',
      userId: 'user-456',
      modelId: 'qwen3.5-turbo',
      messages: [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
      ],
      metadata: { customField: 'value' },
    });

    const json = serializeState(original);
    const restored = deserializeState(json);

    expect(restored.conversationId).toBe(original.conversationId);
    expect(restored.userId).toBe(original.userId);
    expect(restored.modelId).toBe(original.modelId);
    expect(restored.version).toBe(original.version);
    expect(restored.messages).toEqual(original.messages);
    expect(restored.metadata).toEqual(original.metadata);
    expect(restored.createdAt.toISOString()).toBe(original.createdAt.toISOString());
    expect(restored.updatedAt.toISOString()).toBe(original.updatedAt.toISOString());
  });
});
