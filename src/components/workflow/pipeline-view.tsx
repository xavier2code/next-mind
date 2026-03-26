'use client';

import { useEffect, useState, useCallback } from 'react';
import { TaskStatusIcon, type TaskStatus } from './task-status-icon';
import { WorkflowControls, type WorkflowStatus } from './workflow-controls';

export interface TaskInfo {
  id: string;
  description?: string;
  agentType: string;
  skillId: string;
  status: TaskStatus;
}

export interface WaveInfo {
  waveIndex: number;
  tasks: TaskInfo[];
}

export interface PipelineViewProps {
  workflowId: string;
  workflowStatus?: WorkflowStatus;
  initialWaves: WaveInfo[];
  onStatusUpdate?: (update: { taskId: string; status: TaskStatus }) => void;
  onWorkflowStatusChange?: (status: WorkflowStatus) => void;
}

/**
 * Format agent type for display.
 * D-18: Source label format: [{AgentType} Agent] {skillId}
 */
function formatAgentType(agentType: string): string {
  return agentType.charAt(0).toUpperCase() + agentType.slice(1);
}

export function PipelineView({
  workflowId,
  workflowStatus = 'pending',
  initialWaves,
  onStatusUpdate,
  onWorkflowStatusChange,
}: PipelineViewProps) {
  const [waves, setWaves] = useState<WaveInfo[]>(initialWaves);
  const [status, setStatus] = useState<WorkflowStatus>(workflowStatus);

  // Update task status helper
  const updateTaskStatus = useCallback((taskId: string, newStatus: TaskStatus) => {
    setWaves(prevWaves =>
      prevWaves.map(wave => ({
        ...wave,
        tasks: wave.tasks.map(task =>
          task.id === taskId ? { ...task, status: newStatus } : task
        ),
      }))
    );
    onStatusUpdate?.({ taskId, status: newStatus });
  }, [onStatusUpdate]);

  // Handle workflow status changes from controls
  const handleStatusChange = useCallback((newStatus: WorkflowStatus) => {
    setStatus(newStatus);
    onWorkflowStatusChange?.(newStatus);
  }, [onWorkflowStatusChange]);

  // SSE connection for real-time updates
  useEffect(() => {
    const eventSource = new EventSource(`/api/workflow-status?workflowId=${workflowId}`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type !== 'connected' && data.taskId && data.status) {
          updateTaskStatus(data.taskId, data.status);
        }
      } catch (error) {
        console.error('Failed to parse SSE message:', error);
      }
    };

    eventSource.onerror = () => {
      // EventSource will auto-reconnect
    };

    return () => {
      eventSource.close();
    };
  }, [workflowId, updateTaskStatus]);

  return (
    <div className="space-y-4" data-testid="pipeline-view">
      <WorkflowControls
        workflowId={workflowId}
        status={status}
        onStatusChange={handleStatusChange}
      />
      {waves.map((wave, index) => (
        <div key={wave.waveIndex} className="border rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-3">
            Wave {index + 1}
          </h3>
          <div className="space-y-2">
            {wave.tasks.map(task => (
              <div
                key={task.id}
                className="flex items-center gap-3 p-2 bg-gray-50 rounded"
                data-testid={`task-${task.id}`}
              >
                <TaskStatusIcon status={task.status} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {task.description || task.skillId}
                  </p>
                  {/* D-18: Source label format: [{AgentType} Agent] {skillId} */}
                  <p className="text-xs text-gray-500">
                    [{formatAgentType(task.agentType)} Agent] {task.skillId}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
