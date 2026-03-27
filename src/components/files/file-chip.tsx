'use client';

import { useState, useEffect } from 'react';
import { X, RefreshCw, Loader2, FileText, FileCode, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileChipProps {
  filename: string;
  size: number;
  status: 'pending' | 'uploading' | 'uploaded' | 'error';
  progress?: number;
  error?: string;
  fileType?: 'document' | 'code' | 'data';
  onRemove: () => void;
  onRetry?: () => void;
}

export function getTypeIcon(fileType?: string, status?: string) {
  if (status === 'uploading') {
    return <Loader2 className="h-3.5 w-3.5 animate-spin" />;
  }
  if (status === 'error') {
    return <AlertCircle className="h-3.5 w-3.5 text-destructive" />;
  }

  switch (fileType) {
    case 'document': return <FileText className="h-3.5 w-3.5" />;
    case 'code': return <FileCode className="h-3.5 w-3.5" />;
    case 'data': return <FileSpreadsheet className="h-3.5 w-3.5" />;
    default: return <FileText className="h-3.5 w-3.5" />;
  }
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function FileChip({
  filename, size, status, progress = 0, error,
  fileType, onRemove, onRetry,
}: FileChipProps) {
  const [isFading, setIsFading] = useState(false);

  // Auto-fade error chips after 5 seconds (D-07)
  useEffect(() => {
    if (status !== 'error') return;
    const timer = setTimeout(() => setIsFading(true), 5000);
    return () => clearTimeout(timer);
  }, [status]);

  // Remove from DOM after fade completes
  useEffect(() => {
    if (!isFading) return;
    const timer = setTimeout(onRemove, 500);
    return () => clearTimeout(timer);
  }, [isFading, onRemove]);

  const isUploaded = status === 'uploaded';
  const isError = status === 'error';
  const isUploading = status === 'uploading';

  return (
    <div
      role={isError ? 'alert' : 'status'}
      aria-label={`${filename} - ${status}`}
      className={cn(
        'relative inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted text-xs transition-opacity duration-500',
        isError && 'border border-destructive',
        isFading && 'opacity-0',
        isUploaded && 'text-emerald-700'
      )}
    >
      {getTypeIcon(fileType, status)}
      <span className="truncate max-w-[160px]" title={filename}>
        {filename}
      </span>
      <span className="text-[10px] font-medium">
        {isUploading ? `${progress}%` : isError ? error : formatSize(size)}
      </span>

      {isError && onRetry ? (
        <button
          type="button"
          aria-label={`Retry upload of ${filename}`}
          onClick={(e) => { e.stopPropagation(); onRetry(); setIsFading(false); }}
          className="ml-0.5 p-0.5 hover:bg-muted-foreground/10 rounded"
        >
          <RefreshCw className="h-3 w-3" />
        </button>
      ) : (
        <button
          type="button"
          aria-label={`Remove ${filename}`}
          onClick={(e) => { e.stopPropagation(); onRemove(); setIsFading(false); }}
          className="ml-0.5 p-0.5 hover:bg-muted-foreground/10 rounded"
        >
          <X className="h-3 w-3" />
        </button>
      )}

      {/* Progress bar (2px height, bottom of chip) */}
      {isUploading && (
        <div
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Uploading ${filename}`}
          className="absolute bottom-0 left-0 h-0.5 rounded-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      )}
    </div>
  );
}
