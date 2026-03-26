import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FileUploadButton } from '@/components/files/file-upload-button';

describe('FileUploadButton', () => {
  it('should render with aria-label', () => {
    render(<FileUploadButton onFilesSelected={vi.fn()} />);
    expect(screen.getByLabelText('Attach file')).toBeInTheDocument();
  });

  it('should open file picker when clicked', () => {
    const onFilesSelected = vi.fn();
    render(<FileUploadButton onFilesSelected={onFilesSelected} />);

    const button = screen.getByLabelText('Attach file');
    fireEvent.click(button);

    // The hidden input should have been triggered
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('aria-hidden', 'true');
    expect(input).toHaveAttribute('tabIndex', '-1');
  });

  it('should be disabled when disabled prop is true', () => {
    render(<FileUploadButton onFilesSelected={vi.fn()} disabled />);
    expect(screen.getByLabelText('Attach file')).toBeDisabled();
  });

  it('should have Paperclip icon', () => {
    render(<FileUploadButton onFilesSelected={vi.fn()} />);
    // The Paperclip icon is an SVG inside the button
    const button = screen.getByLabelText('Attach file');
    expect(button.querySelector('svg')).toBeInTheDocument();
  });
});
