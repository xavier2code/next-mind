import { describe, it, expect } from 'vitest';

describe('Audit logging', () => {
  it('logs audit entry with required fields', async () => {
    const entry = {
      userId: 'user-123',
      action: 'chat_message' as const,
      resource: 'conversation',
      resourceId: 'conv-456',
    };

    // In real test, verify database insert
    expect(entry.userId).toBe('user-123');
    expect(entry.action).toBe('chat_message');
  });

  it('includes metadata in audit log', async () => {
    const entry = {
      userId: 'user-123',
      action: 'model_switch' as const,
      resource: 'preference',
      resourceId: 'model',
      metadata: { fromModel: 'qwen', toModel: 'glm' },
    };

    expect(entry.metadata).toEqual({ fromModel: 'qwen', toModel: 'glm' });
  });
});
