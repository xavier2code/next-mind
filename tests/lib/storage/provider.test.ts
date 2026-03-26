import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getFileType, ACCEPTED_EXTENSIONS } from '@/lib/storage/types';

describe('Storage Types', () => {
  describe('getFileType', () => {
    it('should classify PDF as document', () => {
      expect(getFileType('report.pdf')).toBe('document');
    });

    it('should classify DOCX as document', () => {
      expect(getFileType('document.docx')).toBe('document');
    });

    it('should classify CSV as data', () => {
      expect(getFileType('data.csv')).toBe('data');
    });

    it('should classify XLSX as data', () => {
      expect(getFileType('spreadsheet.xlsx')).toBe('data');
    });

    it('should classify TS as code', () => {
      expect(getFileType('index.ts')).toBe('code');
    });

    it('should classify PY as code', () => {
      expect(getFileType('script.py')).toBe('code');
    });
  });

  describe('ACCEPTED_EXTENSIONS', () => {
    it('should include PDF', () => {
      expect(ACCEPTED_EXTENSIONS).toContain('.pdf');
    });

    it('should include DOCX', () => {
      expect(ACCEPTED_EXTENSIONS).toContain('.docx');
    });

    it('should include CSV', () => {
      expect(ACCEPTED_EXTENSIONS).toContain('.csv');
    });

    it('should include XLSX', () => {
      expect(ACCEPTED_EXTENSIONS).toContain('.xlsx');
    });

    it('should include code file extensions', () => {
      expect(ACCEPTED_EXTENSIONS).toContain('.ts');
      expect(ACCEPTED_EXTENSIONS).toContain('.py');
      expect(ACCEPTED_EXTENSIONS).toContain('.go');
    });
  });
});
