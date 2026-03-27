import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { FileChip } from '@/components/files/file-chip';

describe('FileChip', () => {
  const baseProps = {
    filename: 'test.pdf',
    size: 1024,
    status: 'pending' as const,
    onRemove: vi.fn(),
  };

  it('should render filename', () => {
    render(<FileChip {...baseProps} />);
    expect(screen.getByText('test.pdf')).toBeInTheDocument();
  });

  it('should render file size for pending state', () => {
    render(<FileChip {...baseProps} />);
    expect(screen.getByText('1.0KB')).toBeInTheDocument();
  });

  it('should show progress percentage for uploading state', () => {
    render(<FileChip {...baseProps} status="uploading" progress={50} />);
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('should show spinner for uploading state', () => {
    render(<FileChip {...baseProps} status="uploading" progress={50} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should show error icon and message for error state', () => {
    render(<FileChip {...baseProps} status="error" error="Upload failed" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Upload failed')).toBeInTheDocument();
  });

  it('should call onRemove when close button is clicked', () => {
    render(<FileChip {...baseProps} />);
    const removeButton = screen.getByLabelText('Remove test.pdf');
    fireEvent.click(removeButton);
    expect(baseProps.onRemove).toHaveBeenCalled();
  });

  it('should show retry button for error state', () => {
    const onRetry = vi.fn();
    render(<FileChip {...baseProps} status="error" error="Failed" onRetry={onRetry} />);
    const retryButton = screen.getByLabelText('Retry upload of test.pdf');
    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalled();
  });

  it('should truncate long filenames', () => {
    render(<FileChip {...baseProps} filename="very-long-filename-that-should-be-truncated.pdf" />);
    const el = screen.getByText('very-long-filename-that-should-be-truncated.pdf');
    expect(el).toHaveClass('truncate');
  });

  it('should show emerald styling for uploaded state', () => {
    const { container } = render(<FileChip {...baseProps} status="uploaded" fileType="document" />);
    const chip = container.firstChild as HTMLElement;
    expect(chip.className).toContain('text-emerald-700');
  });

  it('should have role=status for non-error states', () => {
    render(<FileChip {...baseProps} status="pending" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should show type-specific icons', () => {
    const { rerender } = render(<FileChip {...baseProps} status="uploaded" fileType="code" />);
    // Code file should have FileCode icon (svg element)
    expect(screen.getByRole('status').querySelector('svg')).toBeInTheDocument();

    rerender(<FileChip {...baseProps} status="uploaded" fileType="data" />);
    expect(screen.getByRole('status').querySelector('svg')).toBeInTheDocument();
  });

  it('should format bytes correctly', () => {
    render(<FileChip {...baseProps} size={500} />);
    expect(screen.getByText('500B')).toBeInTheDocument();
  });

  it('should format megabytes correctly', () => {
    render(<FileChip {...baseProps} size={2 * 1024 * 1024} />);
    expect(screen.getByText('2.0MB')).toBeInTheDocument();
  });
});
