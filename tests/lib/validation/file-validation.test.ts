import { describe, it, expect } from 'vitest';

describe('File Validation', () => {
  describe('validateFileClient', () => {
    it('should accept PDF files', async () => {
      const { validateFileClient } = await import('@/lib/validation/file-validation');
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      expect(validateFileClient(file)).toBeNull();
    });

    it('should reject unsupported extensions', async () => {
      const { validateFileClient } = await import('@/lib/validation/file-validation');
      const file = new File(['content'], 'test.exe', { type: 'application/octet-stream' });
      expect(validateFileClient(file)).toBe('Unsupported file type');
    });

    it('should reject files over 100MB', async () => {
      const { validateFileClient } = await import('@/lib/validation/file-validation');
      const file = new File([''], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(file, 'size', { value: 101 * 1024 * 1024 });
      expect(validateFileClient(file)).toBe('File exceeds 100MB');
    });
  });
});
