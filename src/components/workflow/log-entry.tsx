'use client';

import type { LogEntry as LogEntryType } from '@/lib/db/queries';

export interface LogEntryProps {
  entry: LogEntryType;
  className?: string;
}

/**
 * Format timestamp to readable string.
 * VIS-04: Displays time in HH:MM:SS format.
 */
function formatTimestamp(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(date));
}

/**
 * Get color class for log level.
 * VIS-04: Color codes log levels for visual distinction.
 */
function getLevelColor(level: LogEntryType['logLevel']): string {
  switch (level) {
    case 'error':
      return 'text-red-600 dark:text-red-400';
    case 'warning':
      return 'text-amber-600 dark:text-amber-400';
    case 'debug':
      return 'text-gray-500 dark:text-gray-400';
    case 'info':
    default:
      return 'text-blue-600 dark:text-blue-400';
  }
}

/**
 * LogEntry displays a single log entry.
 * VIS-04: Shows timestamp, level, message, and agent flow.
 */
export function LogEntry({ entry, className = '' }: LogEntryProps) {
  return (
    <div
      className={`flex items-start gap-2 py-1 text-xs font-mono ${className}`}
      data-testid={`log-entry-${entry.id}`}
    >
      <span className="text-gray-400 dark:text-gray-500 shrink-0">
        {formatTimestamp(entry.timestamp)}
      </span>
      <span className={`uppercase font-medium shrink-0 ${getLevelColor(entry.logLevel)}`}>
        [{entry.logLevel}]
      </span>
      <span className="flex-1 text-gray-700 dark:text-gray-300 break-all">
        {entry.message}
      </span>
      <span className="text-gray-400 dark:text-gray-500 shrink-0">
        {entry.fromAgent} -&gt; {entry.toAgent}
      </span>
    </div>
  );
}
