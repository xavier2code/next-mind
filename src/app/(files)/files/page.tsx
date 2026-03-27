'use client';

import { useState, useCallback } from 'react';
import { useFileList, type FileListItem } from '@/hooks/use-file-list';
import { useFileDetail } from '@/hooks/use-file-detail';
import { FileTable } from '@/components/files/file-table';
import { FilePreviewPanel } from '@/components/files/file-preview-panel';
import { FileDeleteDialog } from '@/components/files/file-delete-dialog';
import { FileEmptyState } from '@/components/files/file-empty-state';

export default function FilesPage() {
  // List state
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<'filename' | 'size' | 'createdAt' | 'fileType'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [fileType, setFileType] = useState<'all' | 'document' | 'code' | 'data'>('all');

  const { files, total, totalPages, isLoading: listLoading, refetch } = useFileList({
    page, pageSize: 20, sortBy, sortOrder, fileType,
  });

  // Selection state
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const { file: selectedFile, isLoading: detailLoading, refetch: refetchDetail } = useFileDetail(selectedFileId);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<FileListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Handlers
  const handleSelectFile = useCallback((fileId: string) => {
    setSelectedFileId(fileId);
  }, []);

  const handleDeleteFile = useCallback((file: FileListItem) => {
    setDeleteTarget(file);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/files/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      // If deleted file was selected, clear selection
      if (selectedFileId === deleteTarget.id) {
        setSelectedFileId(null);
      }
      setDeleteTarget(null);
      refetch();
    } catch {
      // Show error alert: "删除失败，请重试。"
      alert('删除失败，请重试。');
    } finally {
      setIsDeleting(false);
    }
  }, [deleteTarget, selectedFileId, refetch]);

  const handleRetryExtraction = useCallback(async (fileId: string) => {
    try {
      await fetch(`/api/files/${fileId}/extract`, { method: 'POST' });
      // Refetch detail after triggering retry
      refetchDetail();
      // Also refetch list to update status
      refetch();
    } catch {
      // Silent failure -- retry is non-critical
    }
  }, [refetch, refetchDetail]);

  const handleSortChange = useCallback((newSortBy: string, newSortOrder: 'asc' | 'desc') => {
    setSortBy(newSortBy as 'filename' | 'size' | 'createdAt' | 'fileType');
    setSortOrder(newSortOrder);
  }, []);

  const handleFilterChange = useCallback((newType: 'all' | 'document' | 'code' | 'data') => {
    setFileType(newType);
    setPage(1); // Reset to page 1 on filter change per UI-SPEC
    setSelectedFileId(null); // Clear selection when filter changes
  }, []);

  // Empty state
  if (!listLoading && total === 0) {
    return <FileEmptyState />;
  }

  return (
    <div className="flex h-full">
      {/* Left panel: File table (60%) */}
      <div className="w-[60%] flex flex-col h-full border-r border-border">
        <FileTable
          files={files}
          totalFiles={total}
          selectedFileId={selectedFileId}
          onSelectFile={handleSelectFile}
          onDeleteFile={handleDeleteFile}
          isLoading={listLoading}
          pagination={{ page, totalPages, onPageChange: setPage }}
          filter={{ fileType, onFilterChange: handleFilterChange }}
          sorting={{ sortBy, sortOrder, onSortChange: handleSortChange }}
        />
      </div>

      {/* Right panel: Preview (40%) */}
      <div className="w-[40%] flex flex-col h-full">
        <FilePreviewPanel
          file={selectedFile}
          isLoading={detailLoading}
          onRetryExtraction={handleRetryExtraction}
          onDeleteFile={(file) => setDeleteTarget(file as FileListItem)}
        />
      </div>

      {/* Delete dialog */}
      <FileDeleteDialog
        file={deleteTarget}
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}
