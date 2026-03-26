'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WaveInfo } from './pipeline-view';
import type { WorkflowStatus } from './workflow-status-badge';
import { WorkflowProgress } from './workflow-progress';
import { AgentStatusList } from './agent-status-list';
import { WorkflowControls } from './workflow-controls';
import { WorkflowStatusBadge } from './workflow-status-badge';
import { CollapsibleLogSection } from './collapsible-log-section';

export interface WorkflowPanelProps {
  workflowId: string;
  waves: WaveInfo[];
  workflowStatus: WorkflowStatus;
  className?: string;
  onTaskClick?: (taskId: string) => void;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
}

/**
 * WorkflowPanel is a collapsible container that integrates all workflow visibility components.
 *
 * VIS-05: Provides compact, non-intrusive process visibility.
 * D-01: Embeds workflow panel below user message in chat.
 * D-02: Default collapsed view showing only status badge and progress.
 * D-04: Auto-expands when workflow fails.
 * D-05: Red border styling when workflow fails.
 */
export function WorkflowPanel({
  workflowId,
  waves,
  workflowStatus,
  className = '',
  onTaskClick,
  onPause,
  onResume,
  onCancel,
}: WorkflowPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | undefined>();

  // D-04: Auto-expand on failure
  useEffect(() => {
    if (workflowStatus === 'failed') {
      setIsExpanded(true);
    }
  }, [workflowStatus]);

  const handleTaskClick = (taskId: string) => {
    setSelectedTaskId(prev => prev === taskId ? undefined : taskId);
    onTaskClick?.(taskId);
  };

  // D-05: Red border on failure
  const containerClassName = workflowStatus === 'failed'
    ? 'border border-destructive bg-red-50 dark:bg-red-900/10 rounded-lg'
    : 'border rounded-lg bg-muted/50';

  const showControls = workflowStatus === 'running';

  return (
    <div
      className={`${containerClassName} ${className}`}
      data-testid="workflow-panel"
    >
      {/* Header: Status + Progress + Expand toggle (D-02: collapsed view shows these) */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-3 flex-1">
          <WorkflowStatusBadge status={workflowStatus} />
          <div className="flex-1 min-w-0">
            <WorkflowProgress waves={waves} workflowStatus={workflowStatus} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* D-03: Workflow controls */}
          {showControls && (
            <WorkflowControls
              workflowId={workflowId}
              status={workflowStatus}
              onPause={onPause}
              onCancel={onCancel}
            />
          )}
          {/* Expand/collapse toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-expanded={isExpanded}
            aria-controls={`workflow-content-${workflowId}`}
            className="ml-2"
          >
            {isExpanded ? (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                Collapse
              </>
            ) : (
              <>
                <ChevronRight className="h-4 w-4 mr-1" />
                Expand
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Expanded content: Agent list + logs (D-01: detailed view) */}
      {isExpanded && (
        <div
          id={`workflow-content-${workflowId}`}
          className="border-t px-3 py-2"
        >
          <AgentStatusList
            waves={waves}
            workflowStatus={workflowStatus}
            selectedTaskId={selectedTaskId}
            onTaskClick={handleTaskClick}
          />

          {/* Show log section for selected task */}
          {selectedTaskId && (
            <div className="mt-3">
              <CollapsibleLogSection
                taskId={selectedTaskId}
                defaultExpanded={workflowStatus === 'failed'}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
