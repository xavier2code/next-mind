'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MarkdownPreviewProps {
  content: string | null;
}

export const MarkdownPreview = React.memo(function MarkdownPreview({ content }: MarkdownPreviewProps) {
  if (!content) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        暂无内容
      </div>
    );
  }

  return (
    <ScrollArea className="h-full overflow-y-auto">
      <div className="prose prose-zinc max-w-none p-4">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({ className, children, ...props }: any) {
              const match = /language-(\w+)/.exec(className || '');
              const codeString = String(children).replace(/\n$/, '');

              if (!props.inline && match) {
                return (
                  <SyntaxHighlighter
                    style={oneLight}
                    language={match[1]}
                    PreTag="div"
                    {...props}
                  >
                    {codeString}
                  </SyntaxHighlighter>
                );
              }

              return (
                <code className="bg-zinc-100 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                  {children}
                </code>
              );
            },
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </ScrollArea>
  );
});
