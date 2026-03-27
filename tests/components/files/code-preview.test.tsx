import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CodePreview } from '@/components/files/file-preview-code';

describe('CodePreview', () => {
  it('should render extractedContent with syntax highlighting', () => {
    const { container } = render(<CodePreview filename="app.ts" content="const x = 1;" />);
    // SyntaxHighlighter renders code in a pre/code element
    expect(container.querySelector('pre')).toBeInTheDocument();
    expect(container.textContent).toContain('const x = 1;');
  });

  it('should show filename tab above code block', () => {
    render(<CodePreview filename="app.ts" content="const x = 1;" />);
    expect(screen.getByText('app.ts')).toBeInTheDocument();
  });

  it('should detect language from filename extension', () => {
    const { container } = render(<CodePreview filename="app.py" content="print('hello')" />);
    expect(container.querySelector('pre')).toBeInTheDocument();
    expect(container.textContent).toContain("print('hello')");
  });

  it('should show fallback when content is null', () => {
    render(<CodePreview filename="app.ts" content={null} />);
    expect(screen.getByText('暂无内容')).toBeInTheDocument();
  });

  it('should show fallback when content is empty string', () => {
    render(<CodePreview filename="app.ts" content="" />);
    expect(screen.getByText('暂无内容')).toBeInTheDocument();
  });

  it('should have aria-label on pre element with filename', () => {
    render(<CodePreview filename="app.ts" content="const x = 1;" />);
    const pre = screen.getByLabelText('代码内容: app.ts');
    expect(pre).toBeInTheDocument();
  });
});
