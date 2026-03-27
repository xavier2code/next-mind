import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FileDeleteDialog } from '@/components/files/file-delete-dialog';

describe('FileDeleteDialog', () => {
  const baseProps = {
    file: null as { id: string; filename: string } | null,
    open: false,
    onOpenChange: vi.fn(),
    onConfirm: vi.fn(),
    isDeleting: false,
  };

  it('should render dialog with title and description with filename', () => {
    render(
      <FileDeleteDialog
        {...baseProps}
        open={true}
        file={{ id: 'file-1', filename: 'report.pdf' }}
      />
    );
    expect(screen.getByText('删除文件')).toBeInTheDocument();
    expect(screen.getByText(/确定要删除 report.pdf 吗/)).toBeInTheDocument();
  });

  it('should have cancel button that closes dialog', () => {
    render(
      <FileDeleteDialog
        {...baseProps}
        open={true}
        file={{ id: 'file-1', filename: 'report.pdf' }}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: '取消' }));
    // base-ui Dialog onOpenChange receives (openValue, context)
    expect(baseProps.onOpenChange).toHaveBeenCalledWith(false, expect.any(Object));
  });

  it('should call onConfirm when confirm button clicked', () => {
    render(
      <FileDeleteDialog
        {...baseProps}
        open={true}
        file={{ id: 'file-1', filename: 'report.pdf' }}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: '删除' }));
    expect(baseProps.onConfirm).toHaveBeenCalled();
  });

  it('should show loading state when isDeleting is true', () => {
    render(
      <FileDeleteDialog
        {...baseProps}
        open={true}
        file={{ id: 'file-1', filename: 'report.pdf' }}
        isDeleting={true}
      />
    );
    // When deleting, the confirm button should show "删除中..." text
    expect(screen.getByText('删除中...')).toBeInTheDocument();
  });

  it('should not render content when file is null', () => {
    render(<FileDeleteDialog {...baseProps} open={true} />);
    // Dialog should be open but with no specific filename in description
    expect(screen.getByText('删除文件')).toBeInTheDocument();
  });
});
