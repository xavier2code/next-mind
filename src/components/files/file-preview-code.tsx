'use client';

import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ScrollArea } from '@/components/ui/scroll-area';

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
  return LANGUAGE_MAP[ext] || 'plaintext';
}

interface CodePreviewProps {
  filename: string;
  content: string | null;
}

export const CodePreview = React.memo(function CodePreview({ filename, content }: CodePreviewProps) {
  if (!content) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        暂无内容
      </div>
    );
  }

  const language = getLanguage(filename);

  return (
    <ScrollArea className="overflow-x-auto overflow-y-auto">
      <div>
        {/* Filename tab */}
        <div className="bg-muted px-3 py-1.5 text-xs font-mono text-muted-foreground rounded-t-lg">
          {filename}
        </div>
        {/* Code block */}
        <pre aria-label={`代码内容: ${filename}`}>
          <SyntaxHighlighter
            style={oneLight}
            language={language}
            PreTag="div"
            customStyle={{ margin: 0, borderRadius: '0 0 0.5rem 0.5rem' }}
          >
            {content}
          </SyntaxHighlighter>
        </pre>
      </div>
    </ScrollArea>
  );
});
