import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FileTable } from '@/components/files/file-table';
import type { FileRow } from '@/components/files/file-table-columns';

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

describe('Filter bar', () => {
  const defaultProps = {
    files: [createMockFile()],
    totalFiles: 1,
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

  it('renders 4 filter buttons', () => {
    render(<FileTable {...defaultProps} />);
    // Filter buttons are in the first div with p-2 class
    const filterBar = document.querySelector('.flex.items-center.gap-1.p-2')!;
    const buttons = filterBar.querySelectorAll('button');
    expect(buttons.length).toBe(4);
    expect(buttons[0].textContent).toBe('全部');
    expect(buttons[1].textContent).toBe('文档');
    expect(buttons[2].textContent).toBe('代码');
    expect(buttons[3].textContent).toBe('数据');
  });

  it('active filter button uses variant secondary styling', () => {
    render(<FileTable {...defaultProps} filter={{ fileType: 'document', onFilterChange: vi.fn() }} />);
    // The active filter button should have bg-secondary class
    const filterBar = document.querySelector('.flex.items-center.gap-1.p-2')!;
    const activeButton = filterBar.querySelector('button.bg-secondary');
    expect(activeButton).toBeInTheDocument();
    expect(activeButton!.textContent).toBe('文档');
  });

  it('clicking a filter button calls onFilterChange with the correct type', () => {
    const onFilterChange = vi.fn();
    render(<FileTable {...defaultProps} filter={{ fileType: 'all', onFilterChange }} />);

    const filterBar = document.querySelector('.flex.items-center.gap-1.p-2')!;
    const codeButtons = filterBar.querySelectorAll('button');
    // Buttons: 全部(0), 文档(1), 代码(2), 数据(3)
    fireEvent.click(codeButtons[2]);
    expect(onFilterChange).toHaveBeenCalledWith('code');
  });
});
