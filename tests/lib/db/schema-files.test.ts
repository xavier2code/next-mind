import { describe, it, expect } from 'vitest';
import { files, conversationFiles, FileTypeEnum, FileStatusEnum } from '@/lib/db/schema';

describe('File Storage Tables', () => {
  describe('files table', () => {
    it('should have all required columns', () => {
      const columns = Object.keys(files);
      expect(columns).toContain('id');
      expect(columns).toContain('userId');
      expect(columns).toContain('filename');
      expect(columns).toContain('mimeType');
      expect(columns).toContain('size');
      expect(columns).toContain('fileType');
      expect(columns).toContain('storagePath');
      expect(columns).toContain('status');
      expect(columns).toContain('extractedContent');
      expect(columns).toContain('extractedMarkdown');
      expect(columns).toContain('classification');
      expect(columns).toContain('errorMessage');
      expect(columns).toContain('createdAt');
      expect(columns).toContain('updatedAt');
    });

    it('should be defined as pgTable', () => {
      expect(files).toBeDefined();
      expect(typeof files).toBe('object');
    });
  });

  describe('conversationFiles table', () => {
    it('should have fileId, conversationId, messageId columns', () => {
      const columns = Object.keys(conversationFiles);
      expect(columns).toContain('fileId');
      expect(columns).toContain('conversationId');
      expect(columns).toContain('messageId');
      expect(columns).toContain('createdAt');
    });

    it('should be defined as pgTable', () => {
      expect(conversationFiles).toBeDefined();
      expect(typeof conversationFiles).toBe('object');
    });
  });

  describe('Enum values', () => {
    it('should have correct FileTypeEnum values', () => {
      expect(FileTypeEnum).toEqual(['document', 'code', 'data']);
    });

    it('should have correct FileStatusEnum values', () => {
      expect(FileStatusEnum).toEqual(['uploaded', 'processing', 'ready', 'failed']);
    });
  });
});
