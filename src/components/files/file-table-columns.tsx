import { type ColumnDef } from '@tanstack/react-table';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getTypeIcon, formatSize } from '@/components/files/file-chip';

export interface FileRow {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  fileType: 'document' | 'code' | 'data';
  status: 'uploaded' | 'processing' | 'ready' | 'failed';
  createdAt: string;
  errorMessage: string | null;
}

export interface FileTableCallbacks {
  onSelectFile: (fileId: string) => void;
  onDeleteFile: (file: FileRow) => void;
}

const FILE_TYPE_LABELS: Record<string, string> = {
  document: '文档',
  code: '代码',
  data: '数据',
};

export function timeAgo(dateString: string): string {
  const now = Date.now();
  const date = new Date(dateString).getTime();
  const diffMs = now - date;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return '刚刚';
  if (diffMinutes < 60) return `${diffMinutes} 分钟前`;
  if (diffHours < 24) return `${diffHours} 小时前`;
  if (diffDays < 7) return `${diffDays} 天前`;

  const d = new Date(dateString);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function fileColumns(callbacks: FileTableCallbacks): ColumnDef<FileRow>[] {
  return [
    {
      accessorKey: 'filename',
      header: ({ column }) => {
        const isSorted = column.getIsSorted();
        return (
          <button
            className="inline-flex items-center gap-1"
            onClick={column.getToggleSortingHandler()}
            aria-sort={isSorted === 'asc' ? 'ascending' : isSorted === 'desc' ? 'descending' : undefined}
          >
            文件名
            {isSorted === 'asc' && <ArrowUp className="h-3.5 w-3.5" />}
            {isSorted === 'desc' && <ArrowDown className="h-3.5 w-3.5" />}
            {!isSorted && <ArrowUpDown className="h-3.5 w-3.5" />}
          </button>
        );
      },
      cell: ({ row }) => (
        <div className="flex items-center gap-2 min-w-0">
          {getTypeIcon(row.original.fileType)}
          <span className="truncate" title={row.original.filename}>
            {row.original.filename}
          </span>
        </div>
      ),
      size: undefined, // flex-1
    },
    {
      accessorKey: 'fileType',
      header: () => <span>类型</span>,
      cell: ({ row }) => (
        <span className="bg-muted px-2 py-0.5 rounded text-xs">
          {FILE_TYPE_LABELS[row.original.fileType] || row.original.fileType}
        </span>
      ),
      size: 100,
    },
    {
      accessorKey: 'size',
      header: ({ column }) => {
        const isSorted = column.getIsSorted();
        return (
          <button
            className="inline-flex items-center gap-1"
            onClick={column.getToggleSortingHandler()}
            aria-sort={isSorted === 'asc' ? 'ascending' : isSorted === 'desc' ? 'descending' : undefined}
          >
            大小
            {isSorted === 'asc' && <ArrowUp className="h-3.5 w-3.5" />}
            {isSorted === 'desc' && <ArrowDown className="h-3.5 w-3.5" />}
            {!isSorted && <ArrowUpDown className="h-3.5 w-3.5" />}
          </button>
        );
      },
      cell: ({ row }) => (
        <span className="text-right block">{formatSize(row.original.size)}</span>
      ),
      size: 80,
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => {
        const isSorted = column.getIsSorted();
        return (
          <button
            className="inline-flex items-center gap-1"
            onClick={column.getToggleSortingHandler()}
            aria-sort={isSorted === 'asc' ? 'ascending' : isSorted === 'desc' ? 'descending' : undefined}
          >
            上传时间
            {isSorted === 'asc' && <ArrowUp className="h-3.5 w-3.5" />}
            {isSorted === 'desc' && <ArrowDown className="h-3.5 w-3.5" />}
            {!isSorted && <ArrowUpDown className="h-3.5 w-3.5" />}
          </button>
        );
      },
      cell: ({ row }) => <span>{timeAgo(row.original.createdAt)}</span>,
      size: 140,
    },
    {
      accessorKey: 'status',
      header: () => <span>状态</span>,
      cell: ({ row }) => {
        const status = row.original.status;
        const filename = row.original.filename;
        if (status === 'uploaded' || status === 'processing') {
          return (
            <span
              className="inline-flex items-center gap-1 text-blue-500"
              aria-label={`${filename} - 处理中...`}
            >
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>处理中...</span>
            </span>
          );
        }
        if (status === 'ready') {
          return (
            <span
              className="inline-flex items-center gap-1 text-emerald-500"
              aria-label={`${filename} - 就绪`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>就绪</span>
            </span>
          );
        }
        // failed
        return (
          <span
            className="inline-flex items-center gap-1 text-destructive"
            aria-label={`${filename} - 失败`}
          >
            <AlertCircle className="h-3.5 w-3.5" />
            <span>失败</span>
          </span>
        );
      },
      size: 90,
    },
    {
      id: 'actions',
      header: () => <span>操作</span>,
      cell: ({ row }) => {
        const file = row.original;
        return (
          <div className="flex items-center justify-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`预览 ${file.filename}`}
              onClick={(e) => {
                e.stopPropagation();
                callbacks.onSelectFile(file.id);
              }}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`删除 ${file.filename}`}
              onClick={(e) => {
                e.stopPropagation();
                callbacks.onDeleteFile(file);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
      size: 80,
    },
  ];
}
