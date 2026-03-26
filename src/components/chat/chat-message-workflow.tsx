'use client';

import { WorkflowPanel } from '@/components/workflow/workflow-panel';
import type { WaveInfo } from '@/components/workflow/pipeline-view';
import type { WorkflowStatus } from '@/components/workflow/workflow-status-badge';

export interface ChatMessageWorkflowProps {
  workflowId: string;
  waves: WaveInfo[];
  workflowStatus: WorkflowStatus;
  onTaskClick?: (taskId: string) => void;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
}

/**
 * ChatMessageWorkflow integrates the WorkflowPanel into chat messages.
 *
 * D-01: Embeds workflow panel below user message in chat.
 * Returns null if no workflow data is available.
 */
export function ChatMessageWorkflow({
  workflowId,
  waves,
  workflowStatus,
  onTaskClick,
  onPause,
  onResume,
  onCancel,
}: ChatMessageWorkflowProps) {
  // Return null if no workflow data
  if (!workflowId || waves.length === 0) {
    return null;
  }

  return (
    <div className="mt-2">
      <WorkflowPanel
        workflowId={workflowId}
        waves={waves}
        workflowStatus={workflowStatus}
        onTaskClick={onTaskClick}
        onPause={onPause}
        onResume={onResume}
        onCancel={onCancel}
      />
    </div>
  );
}
