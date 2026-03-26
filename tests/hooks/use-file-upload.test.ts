import { describe, it, expect } from 'vitest';

describe('useFileUpload hook', () => {
  it('should be importable', async () => {
    const mod = await import('@/hooks/use-file-upload');
    expect(mod).toBeDefined();
  });
});
