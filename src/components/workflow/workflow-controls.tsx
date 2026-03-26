'use client';

import { useState, useCallback } from 'react';
import { Pause, Play, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WorkflowStatusBadge, type WorkflowStatus } from './workflow-status-badge';
import { CancelConfirmationDialog } from './cancel-confirmation-dialog';

export interface WorkflowControlsProps {
  workflowId: string;
  status: WorkflowStatus;
  onStatusChange?: (status: WorkflowStatus) => void;
}

/**
 * Workflow control buttons per UI-SPEC and D-01.
 * Location: Above Pipeline view, right-aligned.
 *
 * Visibility rules:
 * - Show Pause when status === 'running'
 * - Show Resume when status === 'paused'
 * - Show Cancel when status === 'running' || status === 'paused' || status === 'pausing'
 */
export function WorkflowControls({
  workflowId,
  status,
  onStatusChange,
}: WorkflowControlsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const executeControl = useCallback(async (action: 'pause' | 'resume' | 'cancel') => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/workflow-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowId, action }),
      });

      const data = await response.json();

      if (data.success && onStatusChange) {
        onStatusChange(data.status);
      }

      return data.success;
    } catch (error) {
      console.error(`Failed to ${action} workflow:`, error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [workflowId, onStatusChange]);

  const handlePause = () => executeControl('pause');
  const handleResume = () => executeControl('resume');
  const handleCancelConfirm = async () => {
    const success = await executeControl('cancel');
    if (success) {
      setShowCancelDialog(false);
    }
  };

  const showPause = status === 'running';
  const showResume = status === 'paused';
  const showCancel = ['running', 'paused', 'pausing'].includes(status);

  // Hide all controls when completed/failed/cancelled
  if (['completed', 'failed', 'cancelled'].includes(status)) {
    return (
      <div className="flex items-center justify-between mb-4">
        <WorkflowStatusBadge status={status} />
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4" data-testid="workflow-controls">
        <WorkflowStatusBadge status={status} />
        <div className="flex items-center gap-2">
          {showPause && (
            <Button
              variant="outline"
              size="sm"
              onClick={handlePause}
              disabled={isLoading}
              data-testid="pause-button"
            >
              <Pause className="w-4 h-4 mr-1" />
              {isLoading ? 'Pausing...' : 'Pause'}
            </Button>
          )}
          {showResume && (
            <Button
              variant="default"
              size="sm"
              onClick={handleResume}
              disabled={isLoading}
              data-testid="resume-button"
            >
              <Play className="w-4 h-4 mr-1" />
              {isLoading ? 'Resuming...' : 'Resume'}
            </Button>
          )}
          {showCancel && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowCancelDialog(true)}
              disabled={isLoading}
              data-testid="cancel-button"
            >
              <X className="w-4 h-4 mr-1" />
              Cancel
            </Button>
          )}
        </div>
      </div>

      <CancelConfirmationDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        onConfirm={handleCancelConfirm}
        isLoading={isLoading}
      />
    </>
  );
}
