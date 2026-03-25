import 'reflect-metadata';
import * as fs from 'fs';
import { z } from 'zod';
import { skill, getSkillMetadata } from '@/lib/skills/decorator';
import type { SkillMetadata, SkillContext, SkillResult } from '@/lib/skills/types';

import { readFile, access, stat } from 'fs/promises';
import { readdir } from 'fs/promises';

/**
 * FileProcessingSkills class with skills for file operations
 */
export class FileProcessingSkills {
  /**
   * Read content from a file
   */
  @skill({
    id: 'file-read',
    name: 'Read File',
    description: 'Read content from a file',
    version: '1.0.0',
    category: 'file',
    tags: ['file', 'read'],
    inputSchema: { path: z.string() },
    requiresApproval: false,
    destructiveActions: [],
    dependencies: [],
    timeout: 10000,
  })
  async readFile(
    input: { path: string },
    context: SkillContext
  ): Promise<SkillResult> {
    try {
      if (!input.path) {
        return { success: false, error: 'Path is required' };
      }

      // Validate path exists
      const stats = await stat(input.path);
      if (!stats) {
        return { success: false, error: `Path does not exist: ${input.path}` };
      }

      const content = await readFile(input.path, 'utf-8');
      return { success: true, data: content };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * List files in a directory
   */
  @skill({
    id: 'file-list',
    name: 'List Files',
    description: 'List files in a directory',
    version: '1.0.0',
    category: 'file',
    tags: ['file', 'list', 'directory'],
    inputSchema: { path: z.string(), pattern: z.string().optional() },
    requiresApproval: false,
    destructiveActions: [],
    dependencies: [],
    timeout: 10000,
  })
  async listFiles(
    input: { path: string; pattern?: string },
    context: SkillContext
  ): Promise<SkillResult> {
    try {
      const stats = await stat(input.path);
      if (!stats) {
        return { success: false, error: `Path does not exist: ${input.path}` };
      }

      if (!stats.isDirectory()) {
        return { success: false, error: `Path is not a directory: ${input.path}` };
      }

      const files = await readdir(input.path, { withFileTypes: true });

      // Apply pattern filter if provided
      const filtered = input.pattern
        ? files.filter((file) => file.name.includes(input.pattern!)).map((file) => file.name)
        : files.map((file) => file.name);

      return { success: true, data: filtered };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

export const fileSkills = new FileProcessingSkills();
