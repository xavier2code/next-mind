import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MarkdownPreview } from '@/components/files/file-preview-markdown';

describe('MarkdownPreview', () => {
  it('should render extractedMarkdown using ReactMarkdown with remarkGfm', () => {
    render(<MarkdownPreview content="# Hello" />);
    // react-markdown renders h1 for # heading
    const heading = document.querySelector('h1');
    expect(heading).toBeInTheDocument();
    expect(heading?.textContent).toContain('Hello');
  });

  it('should render paragraph text', () => {
    render(<MarkdownPreview content="Hello world" />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('should show fallback when content is null', () => {
    render(<MarkdownPreview content={null} />);
    expect(screen.getByText('暂无内容')).toBeInTheDocument();
  });

  it('should show fallback when content is empty string', () => {
    render(<MarkdownPreview content="" />);
    expect(screen.getByText('暂无内容')).toBeInTheDocument();
  });

  it('should render inline code blocks', () => {
    render(<MarkdownPreview content="Use `const x = 1`" />);
    expect(screen.getByText('const x = 1')).toBeInTheDocument();
  });

  it('should render prose container', () => {
    render(<MarkdownPreview content="test" />);
    const prose = document.querySelector('.prose');
    expect(prose).toBeInTheDocument();
  });
});
