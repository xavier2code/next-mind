'use client';

import { AgentTaskRow } from './agent-task-row';
import type { WaveInfo, TaskInfo } from './pipeline-view';
import type { TaskStatus } from './task-status-icon';

export interface AgentStatusListProps {
  waves: WaveInfo[];
  className?: string;
}

/**
 * Get priority for task status (lower = higher priority).
 * Running tasks first, then pending, then completed/failed.
 */
function getStatusPriority(status: TaskStatus): number {
  const priority: Record<TaskStatus, number> = {
    running: 0,
    pending: 1,
    pausing: 2,
    paused: 3,
    completed: 4,
    failed: 5,
    cancelled: 6,
  };
  return priority[status] ?? 7;
}

/**
 * AgentStatusList displays all agents with their current status.
 * VIS-01: Real-time list of active agents.
 * VIS-02: Shows status indicator for each agent.
 */
export function AgentStatusList({ waves, className = '' }: AgentStatusListProps) {
  // Flatten all tasks from all waves
  const allTasks = waves.flatMap(wave => wave.tasks);

  // Sort by status priority
  const sortedTasks = [...allTasks].sort(
    (a, b) => getStatusPriority(a.status) - getStatusPriority(b.status)
  );

  if (sortedTasks.length === 0) {
    return (
      <div className={`text-sm text-gray-500 ${className}`} data-testid="agent-status-list-empty">
        No agents running
      </div>
    );
  }

  const runningCount = allTasks.filter(t => t.status === 'running').length;
  const completedCount = allTasks.filter(t => t.status === 'completed').length;

  return (
    <div className={className} data-testid="agent-status-list">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Agent Status
        </h3>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {runningCount > 0 && `${runningCount} running`}
          {runningCount > 0 && completedCount > 0 && ' / '}
          {completedCount > 0 && `${completedCount} completed`}
        </span>
      </div>
      <div className="space-y-1">
        {sortedTasks.map(task => (
          <AgentTaskRow key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
}
