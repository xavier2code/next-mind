import type { Extractor, ExtractorResult } from '../types';

/**
 * Extension-to-language mapping for fenced code blocks.
 * Claude's discretion per CONTEXT.md: maps file extensions to common language tags.
 */
const LANGUAGE_MAP: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.py': 'python',
  '.java': 'java',
  '.go': 'go',
  '.rs': 'rust',
  '.c': 'c',
  '.h': 'c',
  '.cpp': 'cpp',
  '.css': 'css',
  '.html': 'html',
  '.json': 'json',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.md': 'markdown',
  '.sql': 'sql',
  '.sh': 'bash',
  '.bash': 'bash',
  '.zsh': 'bash',
};

function getLanguage(filename: string): string {
  const ext = '.' + filename.split('.').pop()?.toLowerCase();
  return LANGUAGE_MAP[ext] || '';
}

export class CodeExtractor implements Extractor {
  async extract(buffer: Buffer, filename: string): Promise<ExtractorResult> {
    const content = buffer.toString('utf-8');
    const language = getLanguage(filename);
    const markdown = language
      ? `\`\`\`${language}\n${content}\n\`\`\``
      : `\`\`\`\n${content}\n\`\`\``;
    return {
      extractedContent: content,
      extractedMarkdown: markdown,
    };
  }
}
