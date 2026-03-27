import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FileEmptyState } from '@/components/files/file-empty-state';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('FileEmptyState', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('should render FolderOpen icon', () => {
    render(<FileEmptyState />);
    // FolderOpen icon renders as an SVG
    const icon = document.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('should render heading text', () => {
    render(<FileEmptyState />);
    expect(screen.getByText('还没有上传文件')).toBeInTheDocument();
  });

  it('should render body text', () => {
    render(<FileEmptyState />);
    expect(screen.getByText('在对话中上传文件后，可以在这里管理和预览')).toBeInTheDocument();
  });

  it('should render CTA button', () => {
    render(<FileEmptyState />);
    expect(screen.getByRole('button', { name: '上传第一个文件' })).toBeInTheDocument();
  });

  it('should navigate to "/" when CTA button clicked', () => {
    render(<FileEmptyState />);
    fireEvent.click(screen.getByRole('button', { name: '上传第一个文件' }));
    expect(mockPush).toHaveBeenCalledWith('/');
  });
});
