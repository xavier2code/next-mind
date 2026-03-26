'use client';

export type WorkflowStatus = 'pending' | 'running' | 'pausing' | 'paused' | 'completed' | 'failed' | 'cancelled';

export interface WorkflowStatusBadgeProps {
  status: WorkflowStatus;
  className?: string;
}

const statusConfig: Record<WorkflowStatus, { label: string; className: string }> = {
  pending: {
    label: 'Pending',
    className: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  },
  running: {
    label: 'Running',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  pausing: {
    label: 'Pausing...',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  paused: {
    label: 'Paused',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  },
  completed: {
    label: 'Completed',
    className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  },
  failed: {
    label: 'Failed',
    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  },
};

export function WorkflowStatusBadge({ status, className = '' }: WorkflowStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.pending;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.className} ${className}`}
      data-testid="workflow-status-badge"
      data-status={status}
    >
      {config.label}
    </span>
  );
}
