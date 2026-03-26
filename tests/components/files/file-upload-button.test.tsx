import { describe, it, expect } from 'vitest';

describe('FileUploadButton component', () => {
  it('should be importable', async () => {
    const mod = await import('@/components/files/file-upload-button');
    expect(mod).toBeDefined();
  });
});
