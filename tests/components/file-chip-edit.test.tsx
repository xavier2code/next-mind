import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { FileChip } from '@/components/files/file-chip';

describe('FileChip inline editor', () => {
  const baseProps = {
    filename: 'test.pdf',
    size: 1024,
    status: 'ready' as const,
    onRemove: vi.fn(),
    extractedMarkdown: '# Sample Content\n\nThis is extracted text.',
    onEditStart: vi.fn(),
    onEditContent: vi.fn(),
    onEditCancel: vi.fn(),
  };

  it('should render edit button when status is ready and extractedMarkdown is available', () => {
    render(<FileChip {...baseProps} />);
    const editButton = screen.getByLabelText('编辑 test.pdf 内容');
    expect(editButton).toBeInTheDocument();
  });

  it('should not render edit button without extractedMarkdown', () => {
    render(<FileChip {...baseProps} extractedMarkdown={undefined} />);
    expect(screen.queryByLabelText('编辑 test.pdf 内容')).not.toBeInTheDocument();
  });

  it('should not render edit button when status is not ready', () => {
    render(<FileChip {...baseProps} status="uploaded" />);
    expect(screen.queryByLabelText('编辑 test.pdf 内容')).not.toBeInTheDocument();
  });

  it('should call onEditStart when edit button is clicked and isEditing is false', () => {
    render(<FileChip {...baseProps} isEditing={false} />);
    const editButton = screen.getByLabelText('编辑 test.pdf 内容');
    fireEvent.click(editButton);
    expect(baseProps.onEditStart).toHaveBeenCalledWith('test.pdf');
  });

  it('should call onEditCancel when edit button is clicked and isEditing is true', () => {
    render(<FileChip {...baseProps} isEditing={true} />);
    const editButton = screen.getByLabelText('编辑 test.pdf 内容');
    fireEvent.click(editButton);
    expect(baseProps.onEditCancel).toHaveBeenCalled();
  });

  it('should render textarea when isEditing is true', () => {
    render(<FileChip {...baseProps} isEditing={true} />);
    const textarea = screen.getByLabelText('编辑 test.pdf 的提取内容');
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveValue('# Sample Content\n\nThis is extracted text.');
  });

  it('should pre-populate textarea with editedContent over extractedMarkdown', () => {
    render(<FileChip {...baseProps} isEditing={true} editedContent="Custom edited content" />);
    const textarea = screen.getByLabelText('编辑 test.pdf 的提取内容');
    expect(textarea).toHaveValue('Custom edited content');
  });

  it('should call onEditContent with edited text when save is clicked', () => {
    render(<FileChip {...baseProps} isEditing={true} />);
    const textarea = screen.getByLabelText('编辑 test.pdf 的提取内容');

    act(() => {
      fireEvent.change(textarea, { target: { value: 'New edited content' } });
    });

    const saveButton = screen.getByLabelText('保存 test.pdf 的编辑内容');
    fireEvent.click(saveButton);

    expect(baseProps.onEditContent).toHaveBeenCalledWith('test.pdf', 'New edited content');
  });

  it('should call onEditCancel when cancel is clicked', () => {
    render(<FileChip {...baseProps} isEditing={true} />);
    const cancelButton = screen.getByLabelText('取消编辑');
    fireEvent.click(cancelButton);
    expect(baseProps.onEditCancel).toHaveBeenCalled();
  });

  it('should show blue pencil indicator when editedContent exists and not editing', () => {
    const { container } = render(<FileChip {...baseProps} editedContent="some edit" isEditing={false} />);
    const editButton = screen.getByLabelText('编辑 test.pdf 内容');
    expect(editButton.className).toContain('text-blue-500');
  });

  it('should have aria-expanded=false on edit button when not editing', () => {
    render(<FileChip {...baseProps} isEditing={false} />);
    const editButton = screen.getByLabelText('编辑 test.pdf 内容');
    expect(editButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('should have aria-expanded=true on edit button when editing', () => {
    render(<FileChip {...baseProps} isEditing={true} />);
    const editButton = screen.getByLabelText('编辑 test.pdf 内容');
    expect(editButton).toHaveAttribute('aria-expanded', 'true');
  });

  it('should render editor region with proper aria-label', () => {
    render(<FileChip {...baseProps} isEditing={true} />);
    const editorRegion = screen.getByRole('region');
    expect(editorRegion).toHaveAttribute('aria-label', 'test.pdf 内容编辑器');
  });
});
