import 'reflect-metadata';
import { z } from 'zod';
import { skill, getSkillMetadata } from '@/lib/skills/decorator';
import type { SkillMetadata, SkillContext, SkillResult } from '@/lib/skills/types';
import { getFileById, getFilesByUser } from '@/lib/db/queries';
import { classifyByContent } from '@/lib/extraction/classifier';

/**
 * FileProcessingSkills class with skills for file operations.
 *
 * All skills are database-backed (using getFileById/getFilesByUser) and
 * enforce file ownership (file.userId === context.userId).
 */
export class FileProcessingSkills {
  /**
   * Extract content from an uploaded file (SKIL-01).
   * Returns extractedMarkdown and extractedContent for a ready file.
   */
  @skill({
    id: 'file-extract',
    name: 'Extract File Content',
    description: 'Extract text content from an uploaded file. Returns extractedMarkdown and extractedContent.',
    version: '1.0.0',
    category: 'file',
    tags: ['file', 'extract', 'content'],
    inputSchema: { fileId: z.string().uuid() },
    requiresApproval: false,
    destructiveActions: [],
    dependencies: [],
    timeout: 35000,
  })
  async extractFileContent(
    input: { fileId: string },
    context: SkillContext
  ): Promise<SkillResult> {
    const file = await getFileById(input.fileId);
    if (!file) return { success: false, error: `File not found: ${input.fileId}` };
    if (file.userId !== context.userId) return { success: false, error: 'Access denied' };
    if (file.status !== 'ready') return { success: false, error: `File not ready (status: ${file.status})` };

    return {
      success: true,
      data: {
        fileId: file.id,
        filename: file.filename,
        fileType: file.fileType,
        extractedContent: file.extractedContent,
        extractedMarkdown: file.extractedMarkdown,
      },
    };
  }

  /**
   * Convert file content to a specific output format (SKIL-02).
   * Supports markdown, text, and json output formats.
   */
  @skill({
    id: 'file-convert',
    name: 'Convert File Format',
    description: 'Convert file content to specified output format (markdown, text, or json).',
    version: '1.0.0',
    category: 'file',
    tags: ['file', 'convert', 'format'],
    inputSchema: {
      fileId: z.string().uuid(),
      targetFormat: z.enum(['markdown', 'text', 'json']),
    },
    requiresApproval: false,
    destructiveActions: [],
    dependencies: ['file-extract'],
    timeout: 35000,
  })
  async convertFileFormat(
    input: { fileId: string; targetFormat: 'markdown' | 'text' | 'json' },
    context: SkillContext
  ): Promise<SkillResult> {
    const file = await getFileById(input.fileId);
    if (!file) return { success: false, error: `File not found: ${input.fileId}` };
    if (file.userId !== context.userId) return { success: false, error: 'Access denied' };

    switch (input.targetFormat) {
      case 'markdown':
        return { success: true, data: { format: 'markdown', content: file.extractedMarkdown } };
      case 'text':
        return { success: true, data: { format: 'text', content: file.extractedContent } };
      case 'json':
        return { success: true, data: { format: 'json', content: file.extractedContent } };
    }
  }

  /**
   * Classify a file based on content analysis (SKIL-03).
   * Returns corrected type and classification from the content classifier.
   */
  @skill({
    id: 'file-classify',
    name: 'Classify File',
    description: 'Classify an uploaded file based on content analysis. Returns corrected type and classification.',
    version: '1.0.0',
    category: 'file',
    tags: ['file', 'classify', 'type'],
    inputSchema: { fileId: z.string().uuid() },
    requiresApproval: false,
    destructiveActions: [],
    dependencies: [],
    timeout: 15000,
  })
  async classifyFile(
    input: { fileId: string },
    context: SkillContext
  ): Promise<SkillResult> {
    const file = await getFileById(input.fileId);
    if (!file) return { success: false, error: `File not found: ${input.fileId}` };
    if (file.userId !== context.userId) return { success: false, error: 'Access denied' };

    const result = await classifyByContent(file.filename, file.extractedContent, file.extractedMarkdown);
    return {
      success: true,
      data: {
        fileId: file.id,
        filename: file.filename,
        currentType: file.fileType,
        correctedType: result.correctedType,
        classification: result.classification,
      },
    };
  }

  /**
   * Read content from an uploaded file (SKIL-04 updated).
   * Uses database (getFileById) instead of filesystem.
   * Returns file content, preferring extractedMarkdown over extractedContent.
   */
  @skill({
    id: 'file-read',
    name: 'Read File',
    description: 'Read content from an uploaded file by ID',
    version: '1.0.0',
    category: 'file',
    tags: ['file', 'read'],
    inputSchema: { fileId: z.string().uuid() },
    requiresApproval: false,
    destructiveActions: [],
    dependencies: [],
    timeout: 10000,
  })
  async readFile(
    input: { fileId: string },
    context: SkillContext
  ): Promise<SkillResult> {
    const file = await getFileById(input.fileId);
    if (!file) return { success: false, error: `File not found: ${input.fileId}` };
    if (file.userId !== context.userId) return { success: false, error: 'Access denied' };

    return {
      success: true,
      data: {
        fileId: file.id,
        filename: file.filename,
        content: file.extractedMarkdown || file.extractedContent || '',
      },
    };
  }

  /**
   * List files for the current user (SKIL-04 updated).
   * Uses database (getFilesByUser) instead of filesystem readdir.
   * Optionally filters by fileType.
   */
  @skill({
    id: 'file-list',
    name: 'List Files',
    description: 'List files for the current user, optionally filtered by type',
    version: '1.0.0',
    category: 'file',
    tags: ['file', 'list', 'directory'],
    inputSchema: { fileType: z.enum(['document', 'code', 'data']).optional() },
    requiresApproval: false,
    destructiveActions: [],
    dependencies: [],
    timeout: 10000,
  })
  async listFiles(
    input: { fileType?: 'document' | 'code' | 'data' },
    context: SkillContext
  ): Promise<SkillResult> {
    const userFiles = await getFilesByUser(context.userId);

    const filtered = input.fileType
      ? userFiles.filter(f => f.fileType === input.fileType)
      : userFiles;

    const fileList = filtered.map(f => ({
      id: f.id,
      filename: f.filename,
      fileType: f.fileType,
      size: f.size,
      status: f.status,
      createdAt: f.createdAt,
    }));

    return { success: true, data: fileList };
  }
}

export const fileSkills = new FileProcessingSkills();
