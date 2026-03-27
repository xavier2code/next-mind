import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FilePreviewPanel } from '@/components/files/file-preview-panel';
import type { FileDetail } from '@/hooks/use-file-detail';

const mockFile: FileDetail = {
  id: 'file-1',
  filename: 'report.pdf',
  mimeType: 'application/pdf',
  size: 1024000,
  fileType: 'document',
  status: 'ready',
  createdAt: '2026-03-27T10:00:00Z',
  errorMessage: null,
  extractedContent: 'content text',
  extractedMarkdown: '# Report\n\nThis is a report.',
};

const mockCodeFile: FileDetail = {
  ...mockFile,
  id: 'file-2',
  filename: 'app.ts',
  fileType: 'code',
  extractedMarkdown: null,
  extractedContent: 'const x = 1;',
};

const mockDataFile: FileDetail = {
  ...mockFile,
  id: 'file-3',
  filename: 'data.csv',
  fileType: 'data',
  extractedMarkdown: null,
  extractedContent: JSON.stringify([{ name: 'Alice' }]),
};

const mockFailedFile: FileDetail = {
  ...mockFile,
  id: 'file-4',
  filename: 'broken.pdf',
  status: 'failed',
  errorMessage: 'PDF parse error',
  extractedMarkdown: null,
  extractedContent: null,
};

describe('FilePreviewPanel', () => {
  const baseProps = {
    file: null as FileDetail | null,
    isLoading: false,
    onRetryExtraction: vi.fn(),
    onDeleteFile: vi.fn(),
  };

  it('should show initial state when no file selected', () => {
    render(<FilePreviewPanel {...baseProps} />);
    expect(screen.getByText('选择一个文件查看预览')).toBeInTheDocument();
  });

  it('should render filename in header when file is provided', () => {
    render(<FilePreviewPanel {...baseProps} file={mockFile} />);
    expect(screen.getByText('report.pdf')).toBeInTheDocument();
  });

  it('should render metadata row (type icon + type + size + time)', () => {
    render(<FilePreviewPanel {...baseProps} file={mockFile} />);
    // Should show file type label
    expect(screen.getByText('文档')).toBeInTheDocument();
    // formatSize(1024000) = 1000.0KB
    expect(screen.getByText('1000.0KB')).toBeInTheDocument();
  });

  it('should render MarkdownPreview when file.fileType === document', () => {
    const { container } = render(<FilePreviewPanel {...baseProps} file={mockFile} />);
    // react-markdown renders h1 for # heading
    const heading = container.querySelector('h1');
    expect(heading).toBeInTheDocument();
    expect(heading?.textContent).toContain('Report');
  });

  it('should render CodePreview when file.fileType === code', () => {
    const { container } = render(<FilePreviewPanel {...baseProps} file={mockCodeFile} />);
    // CodePreview shows filename tab and code content
    expect(container.textContent).toContain('app.ts');
    expect(container.textContent).toContain('const x = 1;');
  });

  it('should render DataPreview when file.fileType === data', () => {
    render(<FilePreviewPanel {...baseProps} file={mockDataFile} />);
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('should show error message and retry button when status === failed', () => {
    render(<FilePreviewPanel {...baseProps} file={mockFailedFile} />);
    expect(screen.getByText(/内容提取失败/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /重新提取/ })).toBeInTheDocument();
  });

  it('should call onRetryExtraction with file.id when retry button clicked', () => {
    render(<FilePreviewPanel {...baseProps} file={mockFailedFile} />);
    fireEvent.click(screen.getByRole('button', { name: /重新提取/ }));
    expect(baseProps.onRetryExtraction).toHaveBeenCalledWith('file-4');
  });

  it('should call onDeleteFile when delete button clicked', () => {
    render(<FilePreviewPanel {...baseProps} file={mockFile} />);
    fireEvent.click(screen.getByLabelText(/删除/));
    expect(baseProps.onDeleteFile).toHaveBeenCalledWith(mockFile);
  });
});
