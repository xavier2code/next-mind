'use client';

import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface FileDeleteDialogProps {
  file: { id: string; filename: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

export function FileDeleteDialog({
  file,
  open,
  onOpenChange,
  onConfirm,
  isDeleting,
}: FileDeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>删除文件</DialogTitle>
          <DialogDescription>
            {file
              ? `确定要删除 ${file.filename} 吗？此操作不可撤销。`
              : '确定要删除此文件吗？此操作不可撤销。'}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            取消
          </DialogClose>
          <Button
            variant="destructive"
            onClick={onConfirm}
            aria-disabled={isDeleting}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                删除中...
              </>
            ) : (
              '删除'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
