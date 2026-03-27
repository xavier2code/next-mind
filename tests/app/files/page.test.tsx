import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FilesPage from '@/app/(files)/files/page';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/files',
}));

// Mock hooks
const mockRefetch = vi.fn();
const mockRefetchDetail = vi.fn();
let mockFileListData = {
  files: [] as any[],
  total: 0,
  page: 1,
  totalPages: 0,
  isLoading: false,
  error: null,
  refetch: mockRefetch,
};
let mockSelectedFileId: string | null = null;
let mockFileDetailData: any = {
  file: null,
  isLoading: false,
  error: null,
  refetch: mockRefetchDetail,
};

vi.mock('@/hooks/use-file-list', () => ({
  useFileList: () => mockFileListData,
}));

vi.mock('@/hooks/use-file-detail', () => ({
  useFileDetail: (fileId: string | null) => {
    // Only return file data when a fileId is provided
    if (fileId && mockFileDetailData._file) {
      return {
        file: mockFileDetailData._file,
        isLoading: false,
        error: null,
        refetch: mockRefetchDetail,
      };
    }
    return {
      file: null,
      isLoading: false,
      error: null,
      refetch: mockRefetchDetail,
    };
  },
}));

// Mock global fetch for delete and extract API calls
global.fetch = vi.fn();

describe('FilesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFileListData = {
      files: [],
      total: 0,
      page: 1,
      totalPages: 0,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    };
    mockFileDetailData = { _file: null };
    mockSelectedFileId = null;
  });

  it('should render FileEmptyState when total files is 0', () => {
    render(<FilesPage />);
    expect(screen.getByText('还没有上传文件')).toBeInTheDocument();
  });

  it('should render split layout when files exist', () => {
    mockFileListData = {
      ...mockFileListData,
      files: [
        {
          id: 'f1',
          filename: 'test.pdf',
          mimeType: 'application/pdf',
          size: 1024,
          fileType: 'document' as const,
          status: 'ready' as const,
          createdAt: '2026-03-27T10:00:00Z',
          errorMessage: null,
        },
      ],
      total: 1,
      totalPages: 1,
    };
    render(<FilesPage />);
    // Should show the file table (not empty state)
    expect(screen.queryByText('还没有上传文件')).not.toBeInTheDocument();
    expect(screen.getByText('test.pdf')).toBeInTheDocument();
  });

  it('should render FilePreviewPanel with initial state when no file selected', () => {
    mockFileListData = {
      ...mockFileListData,
      files: [
        {
          id: 'f1',
          filename: 'test.pdf',
          mimeType: 'application/pdf',
          size: 1024,
          fileType: 'document' as const,
          status: 'ready' as const,
          createdAt: '2026-03-27T10:00:00Z',
          errorMessage: null,
        },
      ],
      total: 1,
      totalPages: 1,
    };
    render(<FilesPage />);
    // Preview panel should show initial state
    expect(screen.getByText('选择一个文件查看预览')).toBeInTheDocument();
  });

  it('should show preview when file is selected and detail loads', () => {
    mockFileListData = {
      ...mockFileListData,
      files: [
        {
          id: 'f1',
          filename: 'test.pdf',
          mimeType: 'application/pdf',
          size: 1024,
          fileType: 'document' as const,
          status: 'ready' as const,
          createdAt: '2026-03-27T10:00:00Z',
          errorMessage: null,
        },
      ],
      total: 1,
      totalPages: 1,
    };
    mockFileDetailData = {
      _file: {
        id: 'f1',
        filename: 'test.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        fileType: 'document' as const,
        status: 'ready' as const,
        createdAt: '2026-03-27T10:00:00Z',
        errorMessage: null,
        extractedContent: 'content',
        extractedMarkdown: '# Hello',
      },
    };
    render(<FilesPage />);
    // Select the file by clicking the row (click the Eye icon to avoid multiple text matches)
    fireEvent.click(screen.getByLabelText('预览 test.pdf'));
    // After selecting, preview should show filename in header
    const filenameHeaders = screen.getAllByText('test.pdf');
    expect(filenameHeaders.length).toBeGreaterThanOrEqual(2); // one in table, one in preview
  });

  it('should trigger delete confirmation on Trash2 click', () => {
    mockFileListData = {
      ...mockFileListData,
      files: [
        {
          id: 'f1',
          filename: 'test.pdf',
          mimeType: 'application/pdf',
          size: 1024,
          fileType: 'document' as const,
          status: 'ready' as const,
          createdAt: '2026-03-27T10:00:00Z',
          errorMessage: null,
        },
      ],
      total: 1,
      totalPages: 1,
    };
    render(<FilesPage />);
    // Click delete button on the row
    fireEvent.click(screen.getByLabelText('删除 test.pdf'));
    // Delete dialog should appear
    expect(screen.getByText('删除文件')).toBeInTheDocument();
  });

  it('should call DELETE API and refetch on delete confirm', async () => {
    mockFileListData = {
      ...mockFileListData,
      files: [
        {
          id: 'f1',
          filename: 'test.pdf',
          mimeType: 'application/pdf',
          size: 1024,
          fileType: 'document' as const,
          status: 'ready' as const,
          createdAt: '2026-03-27T10:00:00Z',
          errorMessage: null,
        },
      ],
      total: 1,
      totalPages: 1,
    };
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true });

    render(<FilesPage />);
    // Open delete dialog
    fireEvent.click(screen.getByLabelText('删除 test.pdf'));
    // Confirm delete
    fireEvent.click(screen.getByRole('button', { name: '删除' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/files/f1', { method: 'DELETE' });
      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  it('should show error alert when delete fails', async () => {
    mockFileListData = {
      ...mockFileListData,
      files: [
        {
          id: 'f1',
          filename: 'test.pdf',
          mimeType: 'application/pdf',
          size: 1024,
          fileType: 'document' as const,
          status: 'ready' as const,
          createdAt: '2026-03-27T10:00:00Z',
          errorMessage: null,
        },
      ],
      total: 1,
      totalPages: 1,
    };
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: false });

    // Mock window.alert
    const alertMock = vi.fn();
    vi.spyOn(window, 'alert').mockImplementation(alertMock);

    render(<FilesPage />);
    fireEvent.click(screen.getByLabelText('删除 test.pdf'));
    fireEvent.click(screen.getByRole('button', { name: '删除' }));

    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith('删除失败，请重试。');
    });

    alertMock.mockRestore();
  });

  it('should call POST extract API on retry extraction', async () => {
    mockFileListData = {
      ...mockFileListData,
      files: [
        {
          id: 'f1',
          filename: 'broken.pdf',
          mimeType: 'application/pdf',
          size: 1024,
          fileType: 'document' as const,
          status: 'failed' as const,
          createdAt: '2026-03-27T10:00:00Z',
          errorMessage: 'Error',
        },
      ],
      total: 1,
      totalPages: 1,
    };
    mockFileDetailData = {
      _file: {
        id: 'f1',
        filename: 'broken.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        fileType: 'document' as const,
        status: 'failed' as const,
        createdAt: '2026-03-27T10:00:00Z',
        errorMessage: 'Error',
        extractedContent: null,
        extractedMarkdown: null,
      },
    };
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });

    render(<FilesPage />);
    // Select the file by clicking the Eye icon (avoids multiple text matches for 'broken.pdf')
    fireEvent.click(screen.getByLabelText('预览 broken.pdf'));
    // Wait for the detail to load and preview panel to show retry button
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /重新提取/ })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /重新提取/ }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/files/f1/extract', { method: 'POST' });
    });
  });
});
