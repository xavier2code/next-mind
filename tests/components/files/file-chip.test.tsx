import { describe, it, expect } from 'vitest';

describe('FileChip component', () => {
  it('should be importable', async () => {
    const mod = await import('@/components/files/file-chip');
    expect(mod).toBeDefined();
  });
});
