'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const MAX_ROWS = 100;

interface DataPreviewProps {
  content: string | null;
}

export const DataPreview = React.memo(function DataPreview({ content }: DataPreviewProps) {
  if (!content) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        此文件无可预览的数据
      </div>
    );
  }

  let rows: Record<string, unknown>[];
  try {
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed)) {
      return (
        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
          文件内容格式异常，无法渲染表格。
        </div>
      );
    }
    rows = parsed;
  } catch {
    return (
      <div className="flex items-center gap-2 justify-center h-full text-destructive text-sm">
        <AlertCircle className="h-4 w-4" />
        文件内容格式异常，无法渲染表格。
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        此文件无可预览的数据
      </div>
    );
  }

  const headers = Object.keys(rows[0]);
  const displayRows = rows.length > MAX_ROWS ? rows.slice(0, MAX_ROWS) : rows;
  const totalRows = rows.length;

  return (
    <ScrollArea className="overflow-x-auto overflow-y-auto">
      <div className="p-4">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {headers.map((header) => (
                <th
                  key={header}
                  className="bg-muted font-medium text-sm border border-border px-3 py-2 text-left"
                  scope="col"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, idx) => (
              <tr key={idx} className={idx % 2 === 1 ? 'even:bg-muted/30' : ''}>
                {headers.map((header) => (
                  <td key={header} className="border border-border px-3 py-2 text-sm">
                    {String(row[header] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {totalRows > MAX_ROWS && (
          <div className="text-xs text-muted-foreground mt-2 text-center">
            显示前 {MAX_ROWS} 行，共 {totalRows} 行
          </div>
        )}
      </div>
    </ScrollArea>
  );
});
