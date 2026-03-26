import { describe, it, expect } from 'vitest';
// Tests will verify query function exports and types
describe('File Queries', () => {
  it('should export createFile function', async () => {
    const { createFile } = await import('@/lib/db/queries');
    expect(typeof createFile).toBe('function');
  });

  it('should export getFile function', async () => {
    const { getFile } = await import('@/lib/db/queries');
    expect(typeof getFile).toBe('function');
  });

  it('should export getFilesByUser function', async () => {
    const { getFilesByUser } = await import('@/lib/db/queries');
    expect(typeof getFilesByUser).toBe('function');
  });

  it('should export deleteFile function', async () => {
    const { deleteFile } = await import('@/lib/db/queries');
    expect(typeof deleteFile).toBe('function');
  });

  it('should export linkFileToConversation function', async () => {
    const { linkFileToConversation } = await import('@/lib/db/queries');
    expect(typeof linkFileToConversation).toBe('function');
  });
});
