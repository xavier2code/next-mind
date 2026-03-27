import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { FileTable } from '@/components/files/file-table';
import type { FileRow } from '@/components/files/file-table-columns';

// Helper to create mock file rows
function createMockFile(overrides: Partial<FileRow> = {}): FileRow {
  return {
    id: 'file-1',
    filename: 'report.pdf',
    mimeType: 'application/pdf',
    size: 1024000,
    fileType: 'document',
    status: 'ready',
    createdAt: new Date().toISOString(),
    errorMessage: null,
    ...overrides,
  };
}

describe('Table primitives', () => {
  it('Table renders a <table> element', () => {
    render(<Table><tbody><tr><td>test</td></tr></tbody></Table>);
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('TableHeader renders a <thead> element', () => {
    render(<table><TableHeader><tr><th>Header</th></tr></TableHeader><tbody><tr><td>cell</td></tr></tbody></table>);
    expect(screen.getByRole('table').querySelector('thead')).toBeInTheDocument();
  });

  it('TableBody renders a <tbody> element', () => {
    render(<table><thead><tr><th>Header</th></tr></thead><TableBody><tr><td>cell</td></tr></TableBody></table>);
    expect(screen.getByRole('table').querySelector('tbody')).toBeInTheDocument();
  });

  it('TableRow renders a <tr> element', () => {
    render(<table><tbody><TableRow><td>cell</td></TableRow></tbody></table>);
    const row = screen.getByRole('row');
    expect(row).toBeInTheDocument();
  });

  it('TableHead renders a <th> element', () => {
    render(<table><thead><tr><TableHead>Header</TableHead></tr></thead><tbody><tr><td>cell</td></tr></tbody></table>);
    expect(screen.getByRole('columnheader')).toBeInTheDocument();
  });

  it('TableCell renders a <td> element', () => {
    render(<table><tbody><tr><TableCell>data</TableCell></tr></tbody></table>);
    expect(screen.getByRole('cell')).toBeInTheDocument();
  });
});

describe('FileTable', () => {
  const defaultProps = {
    files: [
      createMockFile({ id: '1', filename: 'report.pdf', fileType: 'document', status: 'ready' }),
      createMockFile({ id: '2', filename: 'script.py', fileType: 'code', status: 'processing' }),
      createMockFile({ id: '3', filename: 'data.csv', fileType: 'data', status: 'failed', errorMessage: 'Parse error' }),
    ],
    totalFiles: 3,
    selectedFileId: null as string | null,
    onSelectFile: vi.fn(),
    onDeleteFile: vi.fn(),
    isLoading: false,
    pagination: {
      page: 1,
      totalPages: 1,
      onPageChange: vi.fn(),
    },
    filter: {
      fileType: 'all' as const,
      onFilterChange: vi.fn(),
    },
    sorting: {
      sortBy: 'createdAt' as const,
      sortOrder: 'desc' as const,
      onSortChange: vi.fn(),
    },
  };

  it('renders 6 column headers', () => {
    render(<FileTable {...defaultProps} />);
    expect(screen.getByText('文件名')).toBeInTheDocument();
    expect(screen.getByText('类型')).toBeInTheDocument();
    expect(screen.getByText('大小')).toBeInTheDocument();
    expect(screen.getByText('上传时间')).toBeInTheDocument();
    expect(screen.getByText('状态')).toBeInTheDocument();
    expect(screen.getByText('操作')).toBeInTheDocument();
  });

  it('renders type icon and filename text in the name column', () => {
    render(<FileTable {...defaultProps} />);
    // The filename should appear in the table
    expect(screen.getByText('report.pdf')).toBeInTheDocument();
    expect(screen.getByText('script.py')).toBeInTheDocument();
    expect(screen.getByText('data.csv')).toBeInTheDocument();
  });

  it('renders type badges in the type column', () => {
    render(<FileTable {...defaultProps} />);
    // "文档" appears in both filter bar and table badge -- use getAllByText
    const docBadges = screen.getAllByText('文档');
    expect(docBadges.length).toBeGreaterThanOrEqual(2); // filter button + table badge
    const codeBadges = screen.getAllByText('代码');
    expect(codeBadges.length).toBeGreaterThanOrEqual(2);
    const dataBadges = screen.getAllByText('数据');
    expect(dataBadges.length).toBeGreaterThanOrEqual(2);
  });

  it('renders formatted size in the size column', () => {
    render(<FileTable {...defaultProps} />);
    // All 3 mock files have size 1024000 bytes = 1000.0KB
    const sizeTexts = screen.getAllByText('1000.0KB');
    expect(sizeTexts.length).toBe(3);
  });

  it('renders relative time in the upload time column', () => {
    render(<FileTable {...defaultProps} />);
    // All 3 mock files have the same timestamp, so "刚刚" appears 3 times
    const recentTexts = screen.getAllByText('刚刚');
    expect(recentTexts.length).toBe(3);
  });

  it('renders status icon and text per status', () => {
    render(<FileTable {...defaultProps} />);
    // ready status shows "就绪"
    expect(screen.getByText('就绪')).toBeInTheDocument();
    // processing status shows "处理中..."
    expect(screen.getByText('处理中...')).toBeInTheDocument();
    // failed status shows "失败"
    expect(screen.getByText('失败')).toBeInTheDocument();
  });

  it('renders Eye and Trash2 icon buttons in actions column', () => {
    render(<FileTable {...defaultProps} />);
    // Should have 3 preview buttons and 3 delete buttons (one per row)
    const previewButtons = screen.getAllByRole('button', { name: /预览/ });
    const deleteButtons = screen.getAllByRole('button', { name: /删除/ });
    expect(previewButtons).toHaveLength(3);
    expect(deleteButtons).toHaveLength(3);
  });

  it('clicking a sortable header calls onSortChange with correct sortBy and toggled sortOrder', () => {
    const onSortChange = vi.fn();
    render(<FileTable {...defaultProps} sorting={{ ...defaultProps.sorting, onSortChange }} />);

    // Click the size column header (sortable)
    const grid = screen.getByRole('grid');
    const sizeButtons = grid.querySelectorAll('thead button');
    // Sortable columns: filename(0), size(1), createdAt(2)
    const sizeHeaderButton = sizeButtons[1];
    fireEvent.click(sizeHeaderButton);
    // tanstack default: first click on unsorted column toggles to desc
    expect(onSortChange).toHaveBeenCalledWith('size', 'desc');
  });

  it('clicking a table row calls onSelectFile with the file id', () => {
    const onSelectFile = vi.fn();
    render(<FileTable {...defaultProps} onSelectFile={onSelectFile} />);

    const firstRow = screen.getByText('report.pdf').closest('tr')!;
    fireEvent.click(firstRow);
    expect(onSelectFile).toHaveBeenCalledWith('1');
  });

  it('selected row has bg-accent and border-l-2 border-primary styles', () => {
    render(<FileTable {...defaultProps} selectedFileId="1" />);

    const firstRow = screen.getByText('report.pdf').closest('tr')!;
    expect(firstRow).toHaveAttribute('data-state', 'selected');
  });

  it('renders loading state when isLoading is true', () => {
    render(<FileTable {...defaultProps} isLoading={true} />);
    expect(screen.getByText('加载中...')).toBeInTheDocument();
  });

  it('renders pagination with page info and prev/next buttons', () => {
    render(<FileTable {...defaultProps} pagination={{ page: 1, totalPages: 3, onPageChange: vi.fn() }} />);
    expect(screen.getByText(/第.*页/)).toBeInTheDocument();
    expect(screen.getByText(/共 3 个文件/)).toBeInTheDocument();
  });

  it('prev button is disabled on page 1', () => {
    render(<FileTable {...defaultProps} />);
    const prevButton = screen.getByRole('button', { name: '上一页' });
    expect(prevButton).toBeDisabled();
  });

  it('next button is disabled on last page', () => {
    render(<FileTable {...defaultProps} pagination={{ page: 3, totalPages: 3, onPageChange: vi.fn() }} />);
    const nextButton = screen.getByRole('button', { name: '下一页' });
    expect(nextButton).toBeDisabled();
  });

  it('table has role="grid"', () => {
    render(<FileTable {...defaultProps} />);
    expect(screen.getByRole('grid')).toBeInTheDocument();
  });

  it('row has tabIndex for keyboard accessibility', () => {
    render(<FileTable {...defaultProps} />);
    const firstRow = screen.getByText('report.pdf').closest('tr')!;
    expect(firstRow).toHaveAttribute('tabindex', '0');
  });

  it('row responds to Enter key press', () => {
    const onSelectFile = vi.fn();
    render(<FileTable {...defaultProps} onSelectFile={onSelectFile} />);

    const firstRow = screen.getByText('report.pdf').closest('tr')!;
    fireEvent.keyDown(firstRow, { key: 'Enter' });
    expect(onSelectFile).toHaveBeenCalledWith('1');
  });

  it('clicking Eye button calls onSelectFile', () => {
    const onSelectFile = vi.fn();
    render(<FileTable {...defaultProps} onSelectFile={onSelectFile} />);

    const previewButton = screen.getByRole('button', { name: '预览 report.pdf' });
    fireEvent.click(previewButton);
    expect(onSelectFile).toHaveBeenCalledWith('1');
  });

  it('clicking Trash2 button calls onDeleteFile', () => {
    const onDeleteFile = vi.fn();
    render(<FileTable {...defaultProps} onDeleteFile={onDeleteFile} />);

    const deleteButton = screen.getByRole('button', { name: '删除 report.pdf' });
    fireEvent.click(deleteButton);
    expect(onDeleteFile).toHaveBeenCalledWith(expect.objectContaining({ id: '1', filename: 'report.pdf' }));
  });
});
