'use client';

import { TaskStatusIcon, type TaskStatus } from './task-status-icon';
import type { TaskInfo } from './pipeline-view';

export interface AgentTaskRowProps {
  task: TaskInfo;
  className?: string;
}

/**
 * Format agent type for display.
 * Reuses pattern from pipeline-view.tsx.
 */
function formatAgentType(agentType: string): string {
  return agentType.charAt(0).toUpperCase() + agentType.slice(1);
}

/**
 * AgentTaskRow displays a single task with its agent info.
 * VIS-02: Shows agent status indicator.
 */
export function AgentTaskRow({ task, className = '' }: AgentTaskRowProps) {
  const getStatusBgClass = (status: TaskStatus) => {
    switch (status) {
      case 'running':
        return 'bg-blue-50 dark:bg-blue-900/20';
      case 'completed':
        return 'bg-green-50 dark:bg-green-900/20';
      case 'failed':
        return 'bg-red-50 dark:bg-red-900/20';
      default:
        return 'bg-gray-50 dark:bg-gray-800';
    }
  };

  return (
    <div
      className={`flex items-center gap-3 p-2 rounded ${getStatusBgClass(task.status)} ${className}`}
      data-testid={`agent-task-row-${task.id}`}
    >
      <TaskStatusIcon status={task.status} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {task.description || task.skillId}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          [{formatAgentType(task.agentType)} Agent]
        </p>
      </div>
    </div>
  );
}
