'use client';

import type { WaveInfo } from './pipeline-view';
import type { WorkflowStatus } from './workflow-status-badge';

export interface WorkflowProgressProps {
  waves: WaveInfo[];
  workflowStatus?: WorkflowStatus;
  className?: string;
}

/**
 * Calculate progress from waves data.
 * D-10: "{completed}/{total} tasks completed ({percentage}%)"
 */
function calculateProgress(waves: WaveInfo[]): { completed: number; total: number; percentage: number } {
  const allTasks = waves.flatMap(w => w.tasks);
  const total = allTasks.length;
  const completed = allTasks.filter(t => t.status === 'completed').length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { completed, total, percentage };
}

/**
 * WorkflowProgress component displays workflow completion as a progress bar.
 *
 * VIS-03: Provides visual feedback on overall workflow completion status.
 * D-10: Label format "{completed}/{total} tasks completed ({percentage}%)"
 * D-11: Status-based colors (running=primary, completed=green, failed=red)
 * D-12: Progress bar styling - 8px height (h-2), rounded, with transition
 */
export function WorkflowProgress({ waves, workflowStatus, className = '' }: WorkflowProgressProps) {
  const { completed, total, percentage } = calculateProgress(waves);

  // D-11/D-12: Progress bar styling - 8px height (h-2), rounded, with transition
  const getFillClassName = () => {
    if (workflowStatus === 'failed') return 'bg-destructive';
    if (workflowStatus === 'completed' || percentage === 100) return 'bg-green-600';
    return 'bg-primary';
  };

  return (
    <div className={className} data-testid="workflow-progress">
      {/* Progress bar - D-12: 8px height, rounded, transition */}
      <div
        className="h-2 bg-muted rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`h-full ${getFillClassName()} transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {/* Progress label - D-10: exact format */}
      <p className="text-sm font-medium text-muted-foreground mt-1">
        {completed}/{total} tasks completed ({percentage}%)
      </p>
    </div>
  );
}
