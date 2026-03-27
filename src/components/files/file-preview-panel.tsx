'use client';

import React from 'react';
import {
  Eye,
  Trash2,
  AlertCircle,
  Loader2,
  RefreshCw,
  CheckCircle2,
  FileText,
  FileCode,
  FileSpreadsheet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MarkdownPreview } from '@/components/files/file-preview-markdown';
import { CodePreview } from '@/components/files/file-preview-code';
import { DataPreview } from '@/components/files/file-preview-data';
import { getTypeIcon, formatSize } from '@/components/files/file-chip';
import { timeAgo } from '@/components/files/file-table-columns';
import type { FileDetail } from '@/hooks/use-file-detail';

const FILE_TYPE_LABELS: Record<string, string> = {
  document: '文档',
  code: '代码',
  data: '数据',
};

interface FilePreviewPanelProps {
  file: FileDetail | null;
  isLoading: boolean;
  onRetryExtraction: (fileId: string) => void;
  onDeleteFile: (file: FileDetail) => void;
}

export function FilePreviewPanel({
  file,
  isLoading,
  onRetryExtraction,
  onDeleteFile,
}: FilePreviewPanelProps) {
  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="text-sm mt-2">加载中...</span>
      </div>
    );
  }

  // No file selected
  if (!file) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <Eye className="h-12 w-12 text-muted-foreground/30" />
        <span className="text-sm mt-2">选择一个文件查看预览</span>
      </div>
    );
  }

  const isFailed = file.status === 'failed';
  const isProcessing = file.status === 'uploaded' || file.status === 'processing';
  const isReady = file.status === 'ready';

  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div className="border-b border-border p-4">
        {/* Top row: filename + delete button */}
        <div className="flex items-center justify-between">
          <h3
            className="text-base font-medium truncate pr-2"
            title={file.filename}
          >
            {file.filename}
          </h3>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`删除 ${file.filename}`}
            onClick={() => onDeleteFile(file)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Metadata row */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
          {getTypeIcon(file.fileType)}
          <span>{FILE_TYPE_LABELS[file.fileType] || file.fileType}</span>
          <span>|</span>
          <span>{formatSize(file.size)}</span>
          <span>|</span>
          <span>{timeAgo(file.createdAt)}</span>
        </div>

        {/* Status bar */}
        <div className="flex items-center gap-2 mt-2">
          {isFailed && (
            <>
              <span className="inline-flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="h-3.5 w-3.5" />
                {file.errorMessage || '提取失败'}
              </span>
              <Button
                variant="outline"
                size="sm"
                aria-label={`重新提取 ${file.filename}`}
                onClick={() => onRetryExtraction(file.id)}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                重新提取
              </Button>
            </>
          )}
          {isProcessing && (
            <span className="inline-flex items-center gap-1 text-xs text-blue-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              处理中...
            </span>
          )}
          {isReady && (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-500">
              <CheckCircle2 className="h-3.5 w-3.5" />
              就绪
            </span>
          )}
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 min-h-0" aria-live="polite">
        {isFailed ? (
          <div
            className="flex items-center gap-2 justify-center h-full text-destructive text-sm p-4"
            role="alert"
          >
            <AlertCircle className="h-4 w-4" />
            内容提取失败：{file.errorMessage}
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div key={file.id}>
              {file.fileType === 'document' && (
                <MarkdownPreview content={file.extractedMarkdown} />
              )}
              {file.fileType === 'code' && (
                <CodePreview filename={file.filename} content={file.extractedContent} />
              )}
              {file.fileType === 'data' && (
                <DataPreview content={file.extractedContent} />
              )}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
