import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DataPreview } from '@/components/files/file-preview-data';

describe('DataPreview', () => {
  it('should parse extractedContent JSON and render HTML table with headers', () => {
    const data = JSON.stringify([
      { name: 'Alice', age: 30 },
      { name: 'Bob', age: 25 },
    ]);
    render(<DataPreview content={data} />);
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('name')).toBeInTheDocument();
    expect(screen.getByText('age')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('should show error message when JSON parse fails', () => {
    render(<DataPreview content="not valid json" />);
    expect(screen.getByText('文件内容格式异常，无法渲染表格。')).toBeInTheDocument();
  });

  it('should show fallback when content is null', () => {
    render(<DataPreview content={null} />);
    expect(screen.getByText('此文件无可预览的数据')).toBeInTheDocument();
  });

  it('should show fallback when content is empty string', () => {
    render(<DataPreview content="" />);
    expect(screen.getByText('此文件无可预览的数据')).toBeInTheDocument();
  });

  it('should limit to 100 rows with footer text when more rows exist', () => {
    const rows = Array.from({ length: 150 }, (_, i) => ({ id: i, name: `item-${i}` }));
    render(<DataPreview content={JSON.stringify(rows)} />);
    expect(screen.getByText('显示前 100 行，共 150 行')).toBeInTheDocument();
  });

  it('should not show footer text when rows are under 100', () => {
    const rows = Array.from({ length: 50 }, (_, i) => ({ id: i, name: `item-${i}` }));
    render(<DataPreview content={JSON.stringify(rows)} />);
    expect(screen.queryByText(/显示前 100 行/)).not.toBeInTheDocument();
  });
});
