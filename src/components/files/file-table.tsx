'use client';

import { useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type SortingState,
} from '@tanstack/react-table';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { fileColumns } from '@/components/files/file-table-columns';
import type { FileRow } from '@/components/files/file-table-columns';

interface FileTableProps {
  files: FileRow[];
  totalFiles: number;
  selectedFileId: string | null;
  onSelectFile: (fileId: string) => void;
  onDeleteFile: (file: FileRow) => void;
  isLoading: boolean;
  pagination: {
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
  filter: {
    fileType: 'all' | 'document' | 'code' | 'data';
    onFilterChange: (type: 'all' | 'document' | 'code' | 'data') => void;
  };
  sorting: {
    sortBy: 'filename' | 'size' | 'createdAt' | 'fileType';
    sortOrder: 'asc' | 'desc';
    onSortChange: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  };
}

const FILTER_OPTIONS = [
  { value: 'all' as const, label: '全部' },
  { value: 'document' as const, label: '文档' },
  { value: 'code' as const, label: '代码' },
  { value: 'data' as const, label: '数据' },
];

export function FileTable({
  files,
  totalFiles,
  selectedFileId,
  onSelectFile,
  onDeleteFile,
  isLoading,
  pagination,
  filter,
  sorting,
}: FileTableProps) {
  const [sortingState, setSortingState] = useState<SortingState>([
    { id: sorting.sortBy, desc: sorting.sortOrder === 'desc' },
  ]);

  const columns = fileColumns({ onSelectFile, onDeleteFile });

  const table = useReactTable({
    data: files,
    columns,
    state: { sorting: sortingState },
    onSortingChange: (updater) => {
      const newSorting = typeof updater === 'function' ? updater(sortingState) : updater;
      setSortingState(newSorting);
      if (newSorting.length > 0) {
        sorting.onSortChange(newSorting[0].id, newSorting[0].desc ? 'desc' : 'asc');
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    // Server-side pagination -- do NOT use getPaginationRowModel
    manualPagination: true,
  });

  return (
    <div className="flex flex-col border-r border-border h-full">
      {/* Filter bar */}
      <div className="flex items-center gap-1 p-2">
        {FILTER_OPTIONS.map((option) => (
          <Button
            key={option.value}
            variant={filter.fileType === option.value ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => filter.onFilterChange(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {/* Table */}
      <Table role="grid" className="flex-1">
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} style={{ width: header.getSize() }}>
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                加载中...
              </TableCell>
            </TableRow>
          ) : table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                暂无文件
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => {
              const isSelected = row.original.id === selectedFileId;
              return (
                <TableRow
                  key={row.id}
                  data-state={isSelected ? 'selected' : undefined}
                  className={isSelected ? 'border-l-2 border-primary' : ''}
                  tabIndex={0}
                  onClick={() => onSelectFile(row.original.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectFile(row.original.id);
                    }
                  }}
                  aria-selected={isSelected}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      {/* Pagination bar */}
      <div className="flex items-center justify-end gap-2 p-2">
        <span className="text-sm text-muted-foreground">
          第 {pagination.page} 页，共 {pagination.totalPages} 页
        </span>
        <span className="text-sm text-muted-foreground">
          共 {totalFiles} 个文件
        </span>
        <Button
          variant="outline"
          size="sm"
          aria-label="上一页"
          disabled={pagination.page <= 1}
          onClick={() => pagination.onPageChange(pagination.page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          aria-label="下一页"
          disabled={pagination.page >= pagination.totalPages}
          onClick={() => pagination.onPageChange(pagination.page + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
