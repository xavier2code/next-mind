import 'reflect-metadata';
import { z } from 'zod';
import { skill, getSkillMetadata } from '@/lib/skills/decorator';
import type { SkillMetadata, SkillContext, SkillResult } from '@/lib/skills/types';

/**
 * DataAnalysisSkills class with data analysis skills
 */
export class DataAnalysisSkills {
  /**
   * Perform basic statistical analysis on data
   */
  @skill({
    id: 'data-analyze',
    name: 'Analyze Data',
    description: 'Perform basic statistical analysis on data',
    version: '1.0.0',
    category: 'data',
    tags: ['data', 'analysis', 'statistics'],
    inputSchema: {
      data: z.array(z.number()),
      operations: z.array(z.enum(['count', 'sum', 'avg', 'min', 'max'])),
    },
    requiresApproval: false,
    destructiveActions: [],
    dependencies: [],
    timeout: 5000,
  })
  async analyzeData(
    input: { data: number[]; operations: string[] },
    context: SkillContext
  ): Promise<SkillResult> {
    try {
      if (!input.data || input.data.length === 0) {
        return { success: false, error: 'Data array is required' };
      }

      const result: Record<string, number | undefined> = {};

      for (const op of input.operations) {
        if (op === 'count') result.count = input.data.length;
        if (op === 'sum') result.sum = input.data.reduce((a, b) => a + b, 0);
        if (op === 'avg') result.avg = (result.sum ?? 0) / input.data.length;
        if (op === 'min') result.min = Math.min(...input.data);
        if (op === 'max') result.max = Math.max(...input.data);
      }

      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Transform data between formats (JSON, CSV)
   */
  @skill({
    id: 'data-transform',
    name: 'Transform Data',
    description: 'Transform data between formats (JSON, CSV)',
    version: '1.0.0',
    category: 'data',
    tags: ['data', 'transform', 'format'],
    inputSchema: {
      data: z.union([z.array(z.unknown()), z.string()]),
      fromFormat: z.enum(['json', 'csv']),
      toFormat: z.enum(['json', 'csv']),
    },
    requiresApproval: false,
    destructiveActions: [],
    dependencies: [],
    timeout: 5000,
  })
  async transformData(
    input: { data: unknown[] | string; fromFormat: 'json' | 'csv'; toFormat: 'json' | 'csv' },
    context: SkillContext
  ): Promise<SkillResult> {
    try {
      let result: unknown;

      if (input.fromFormat === 'json' && input.toFormat === 'csv') {
        // JSON to CSV
        if (!Array.isArray(input.data)) {
          return { success: false, error: 'JSON to CSV requires array input' };
        }
        const arr = input.data as Record<string, unknown>[];
        const headers = arr.length > 0 ? Object.keys(arr[0]) : [];
        const csvRows = [headers.join(',')];
        for (const item of arr) {
          const values = headers.map((h) => {
            const val = item[h];
            return typeof val === 'string' ? `"${val}"` : String(val);
          });
          csvRows.push(values.join(','));
        }
        result = csvRows.join('\n');
      } else if (input.fromFormat === 'csv' && input.toFormat === 'json') {
        // CSV to JSON
        if (typeof input.data !== 'string') {
          return { success: false, error: 'CSV to JSON requires string input' };
        }
        const lines = (input.data as string).trim().split('\n');
        const headers = lines[0].split(',');
        const jsonResult: Record<string, unknown>[] = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',');
          const obj: Record<string, unknown> = {};
          for (let j = 0; j < headers.length; j++) {
            obj[headers[j]] = values[j];
          }
          jsonResult.push(obj);
        }
        result = jsonResult;
      } else {
        return {
          success: false,
          error: `Unsupported format conversion: ${input.fromFormat} to ${input.toFormat}`,
        };
      }

      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}

export const dataSkills = new DataAnalysisSkills();
