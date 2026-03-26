'use client';

import { useRef } from 'react';
import { Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ACCEPTED_EXTENSIONS } from '@/lib/storage/types';

interface FileUploadButtonProps {
  onFilesSelected: (fileList: FileList) => void;
  disabled?: boolean;
}

export function FileUploadButton({ onFilesSelected, disabled }: FileUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const acceptString = ACCEPTED_EXTENSIONS.join(',');

  function handleClick() {
    inputRef.current?.click();
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files;
    if (fileList && fileList.length > 0) {
      onFilesSelected(fileList);
    }
    // Reset input so the same file can be selected again
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Attach file"
        disabled={disabled}
        onClick={handleClick}
        className="h-8 w-8 text-muted-foreground hover:text-foreground active:scale-95 transition-transform duration-100 flex-shrink-0"
      >
        <Paperclip className="h-4 w-4" />
      </Button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={acceptString}
        onChange={handleChange}
        aria-hidden="true"
        tabIndex={-1}
        className="hidden"
      />
    </>
  );
}
