'use client';

import { useRef } from 'react';

interface FileUploadButtonProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  className?: string;
  children?: React.ReactNode;
}

/**
 * File upload button component.
 * Will be expanded in Plan 03 with full UI and drag-and-drop.
 */
export function FileUploadButton({ onFileSelect, accept, className, children }: FileUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
    // Reset input so the same file can be selected again
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
      />
      <button onClick={() => inputRef.current?.click()} className={className}>
        {children || 'Upload File'}
      </button>
    </>
  );
}
