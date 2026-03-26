'use client';

import { cn } from '@/lib/utils';

interface FileChipProps {
  filename: string;
  fileType: 'document' | 'code' | 'data';
  size?: number;
  onRemove?: () => void;
  className?: string;
}

/**
 * File chip component for displaying uploaded files in chat.
 * Will be expanded in Plan 03 with full UI.
 */
export function FileChip({ filename, fileType, size, onRemove, className }: FileChipProps) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-sm', className)}>
      <span>{filename}</span>
      {size !== undefined && <span className="text-muted-foreground">({(size / 1024).toFixed(1)}KB)</span>}
      {onRemove && (
        <button onClick={onRemove} className="ml-1 text-muted-foreground hover:text-foreground">&times;</button>
      )}
    </span>
  );
}
