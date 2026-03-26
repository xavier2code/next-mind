'use client';

import { useState, useCallback } from 'react';
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { LogEntry } from './log-entry';
import type { LogEntry as LogEntryType } from '@/lib/db/queries';

export interface CollapsibleLogSectionProps {
  taskId: string;
  className?: string;
}

/**
 * CollapsibleLogSection allows users to optionally view logs.
 * VIS-04: Optional log visibility for debugging.
 */
export function CollapsibleLogSection({ taskId, className = '' }: CollapsibleLogSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<LogEntryType[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleToggle = useCallback(async () => {
    if (!isExpanded && logs.length === 0) {
      // Fetch logs when expanding for the first time
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/task-logs?taskId=${taskId}`);
        const data = await response.json();
        if (response.ok) {
          setLogs(data.logs);
        } else {
          setError(data.error || 'Failed to load logs');
        }
      } catch (err) {
        setError('Failed to load logs');
      } finally {
        setIsLoading(false);
      }
    }
    setIsExpanded(!isExpanded);
  }, [isExpanded, logs.length, taskId]);

  return (
    <div className={className} data-testid="collapsible-log-section">
      <button
        onClick={handleToggle}
        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
        data-testid="log-toggle-button"
        type="button"
      >
        {isExpanded ? (
          <ChevronDown className="w-3 h-3" />
        ) : (
          <ChevronRight className="w-3 h-3" />
        )}
        <span>View Logs</span>
      </button>

      {isExpanded && (
        <div className="mt-2 pl-4 border-l-2 border-gray-200 dark:border-gray-700" data-testid="log-content">
          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-gray-500 py-2">
              <Loader2 className="w-3 h-3 animate-spin" />
              Loading logs...
            </div>
          )}

          {error && (
            <div className="text-xs text-red-500 py-2">{error}</div>
          )}

          {!isLoading && !error && logs.length === 0 && (
            <div className="text-xs text-gray-500 py-2">No logs available</div>
          )}

          {!isLoading && !error && logs.length > 0 && (
            <div className="space-y-0.5 max-h-48 overflow-y-auto">
              {logs.map(log => (
                <LogEntry key={log.id} entry={log} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
