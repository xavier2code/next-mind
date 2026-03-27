'use client';

import { FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export function FileEmptyState() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <FolderOpen className="h-16 w-16 text-muted-foreground/30" />
      <h2 className="text-lg font-medium text-muted-foreground mt-4">
        还没有上传文件
      </h2>
      <p className="text-sm text-muted-foreground mt-1">
        在对话中上传文件后，可以在这里管理和预览
      </p>
      <Button
        variant="outline"
        className="mt-4"
        onClick={() => router.push('/')}
      >
        上传第一个文件
      </Button>
    </div>
  );
}
