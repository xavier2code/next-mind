'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import Link from 'next/link';
import { User, Bot } from 'lucide-react';
import { ChatMessageWorkflow } from './chat-message-workflow';
import { getTypeIcon, formatSize } from '@/components/files/file-chip';
import type { WaveInfo } from '@/components/workflow/pipeline-view';
import type { WorkflowStatus } from '@/components/workflow/workflow-status-badge';

interface ChatMessageProps {
  message: {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    attachments?: Array<{ id: string; filename: string; fileType: string; size: number }>;
  };
  workflow?: {
    id: string;
    status: WorkflowStatus;
    waves: WaveInfo[];
  };
}

export function ChatMessage({ message, workflow }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-4 p-6 ${isUser ? 'bg-white' : 'bg-zinc-50'}`}>
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser ? 'bg-blue-600 text-white' : 'bg-zinc-200 text-zinc-600'
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm mb-1">
          {isUser ? 'You' : 'Assistant'}
        </div>
        <div className="prose prose-zinc max-w-none">
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
            {message.content}
          </ReactMarkdown>
        </div>
        {/* Attachment bar (D-08): only for user messages with attachments */}
        {isUser && message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2" aria-label="附件">
            {message.attachments.map((att) => (
              <Link
                key={att.id}
                href={`/files?id=${att.id}`}
                title={`${att.filename} - ${formatSize(att.size)}`}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                {getTypeIcon(att.fileType)}
                <span className="truncate max-w-[160px]">{att.filename}</span>
                <span>{formatSize(att.size)}</span>
              </Link>
            ))}
          </div>
        )}
        {/* D-01: Embed workflow panel below user message */}
        {isUser && workflow && (
          <ChatMessageWorkflow
            workflowId={workflow.id}
            waves={workflow.waves}
            workflowStatus={workflow.status}
          />
        )}
      </div>
    </div>
  );
}
