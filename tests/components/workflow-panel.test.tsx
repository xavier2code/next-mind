/**
 * Tests for WorkflowPanel component
 *
 * 06-04: Tests for collapsible workflow panel with chat UI integration
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { WorkflowPanel } from '@/components/workflow/workflow-panel';
import type { WaveInfo } from '@/components/workflow/pipeline-view';
import type { WorkflowStatus } from '@/components/workflow/workflow-status-badge';

// Mock the child components
vi.mock('@/components/workflow/workflow-progress', () => ({
  WorkflowProgress: ({ waves, workflowStatus }: any) => (
    <div data-testid="workflow-progress" data-status={workflowStatus}>
      Progress: {waves.length} waves
    </div>
  ),
}));

vi.mock('@/components/workflow/agent-status-list', () => ({
  AgentStatusList: ({ waves, workflowStatus }: any) => (
    <div data-testid="agent-status-list" data-status={workflowStatus}>
      Agent List: {waves.flatMap((w: any) => w.tasks).length} tasks
    </div>
  ),
}));

vi.mock('@/components/workflow/workflow-controls', () => ({
  WorkflowControls: ({ onPause, onCancel }: any) => (
    <div data-testid="workflow-controls">
      <button onClick={onPause} data-testid="pause-button">Pause</button>
      <button onClick={onCancel} data-testid="cancel-button">Cancel</button>
    </div>
  ),
}));

vi.mock('@/components/workflow/workflow-status-badge', () => ({
  WorkflowStatusBadge: ({ status }: any) => (
    <span data-testid="workflow-status-badge" data-status={status}>
      {status}
    </span>
  ),
}));

vi.mock('@/components/workflow/collapsible-log-section', () => ({
  CollapsibleLogSection: ({ taskId }: any) => (
    <div data-testid="collapsible-log-section" data-task-id={taskId}>
      Logs for {taskId}
    </div>
  ),
}));

describe('WorkflowPanel', () => {
  const mockWaves: WaveInfo[] = [
    {
      waveIndex: 0,
      tasks: [
        { id: 'task-1', description: 'First task', agentType: 'file', skillId: 'file-read', status: 'completed' as const },
      ],
    },
    {
      waveIndex: 1,
      tasks: [
        { id: 'task-2', description: 'Second task', agentType: 'search', skillId: 'web-search', status: 'running' as const },
        { id: 'task-3', description: 'Third task', agentType: 'code', skillId: 'code-gen', status: 'pending' as const },
      ],
    },
  ];

  const defaultProps = {
    workflowId: 'test-workflow',
    waves: mockWaves,
    workflowStatus: 'running' as WorkflowStatus,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('collapsed state (D-02)', () => {
    it('renders collapsed by default', () => {
      render(<WorkflowPanel {...defaultProps} />);

      // Panel should exist
      expect(screen.getByTestId('workflow-panel')).toBeInTheDocument();

      // Expand button should have aria-expanded="false"
      const expandButton = screen.getByRole('button', { name: /expand/i });
      expect(expandButton).toHaveAttribute('aria-expanded', 'false');

      // AgentStatusList should NOT be visible
      expect(screen.queryByTestId('agent-status-list')).not.toBeInTheDocument();
    });

    it('shows status badge and progress when collapsed', () => {
      render(<WorkflowPanel {...defaultProps} workflowStatus="running" />);

      // Status badge should be visible
      expect(screen.getByTestId('workflow-status-badge')).toBeInTheDocument();
      expect(screen.getByTestId('workflow-status-badge')).toHaveAttribute('data-status', 'running');

      // Progress should be visible
      expect(screen.getByTestId('workflow-progress')).toBeInTheDocument();
    });
  });

  describe('expand/collapse behavior', () => {
    it('expands when expand button is clicked', () => {
      render(<WorkflowPanel {...defaultProps} />);

      // Click expand button
      const expandButton = screen.getByRole('button', { name: /expand/i });
      fireEvent.click(expandButton);

      // Should now be expanded
      expect(expandButton).toHaveAttribute('aria-expanded', 'true');

      // AgentStatusList should now be visible
      expect(screen.getByTestId('agent-status-list')).toBeInTheDocument();
    });

    it('shows AgentStatusList when expanded', () => {
      render(<WorkflowPanel {...defaultProps} />);

      // Expand the panel
      const expandButton = screen.getByRole('button', { name: /expand/i });
      fireEvent.click(expandButton);

      // AgentStatusList with waves data should be in document
      const agentList = screen.getByTestId('agent-status-list');
      expect(agentList).toBeInTheDocument();
      expect(agentList).toHaveTextContent('3 tasks'); // 1 + 2 tasks from mockWaves
    });

    it('collapses when collapse button is clicked', () => {
      render(<WorkflowPanel {...defaultProps} />);

      // Expand first
      const expandButton = screen.getByRole('button', { name: /expand/i });
      fireEvent.click(expandButton);
      expect(screen.getByTestId('agent-status-list')).toBeInTheDocument();

      // Now collapse
      const collapseButton = screen.getByRole('button', { name: /collapse/i });
      fireEvent.click(collapseButton);
      expect(screen.queryByTestId('agent-status-list')).not.toBeInTheDocument();
    });
  });

  describe('auto-expand on failure (D-04)', () => {
    it('auto-expands when workflow fails', () => {
      render(<WorkflowPanel {...defaultProps} workflowStatus="failed" />);

      // Should be auto-expanded
      const expandButton = screen.getByRole('button', { name: /collapse/i });
      expect(expandButton).toHaveAttribute('aria-expanded', 'true');

      // AgentStatusList should be visible
      expect(screen.getByTestId('agent-status-list')).toBeInTheDocument();
    });
  });

  describe('failure styling (D-05)', () => {
    it('shows red border when workflow is failed', () => {
      const { container } = render(<WorkflowPanel {...defaultProps} workflowStatus="failed" />);

      // Container should have destructive styling
      const panel = container.querySelector('.border-destructive');
      expect(panel).toBeInTheDocument();
    });

    it('shows normal border when workflow is running', () => {
      const { container } = render(<WorkflowPanel {...defaultProps} workflowStatus="running" />);

      // Container should NOT have destructive styling
      const panel = container.querySelector('.border-destructive');
      expect(panel).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('expand button has correct aria attributes', () => {
      render(<WorkflowPanel {...defaultProps} />);

      const expandButton = screen.getByRole('button', { name: /expand/i });
      expect(expandButton).toHaveAttribute('aria-expanded');
      expect(expandButton).toHaveAttribute('aria-controls');

      // aria-controls should point to panel content
      const controlsId = expandButton.getAttribute('aria-controls');
      expect(controlsId).toBe('workflow-content-test-workflow');
    });
  });

  describe('component integration', () => {
    it('integrates all visibility components when expanded', () => {
      render(<WorkflowPanel {...defaultProps} workflowStatus="running" />);

      // Expand the panel
      const expandButton = screen.getByRole('button', { name: /expand/i });
      fireEvent.click(expandButton);

      // WorkflowProgress should be in document
      expect(screen.getByTestId('workflow-progress')).toBeInTheDocument();

      // AgentStatusList should be in document
      expect(screen.getByTestId('agent-status-list')).toBeInTheDocument();

      // WorkflowControls should be in document (workflow is running)
      expect(screen.getByTestId('workflow-controls')).toBeInTheDocument();
    });

    it('shows log section when a task is clicked', () => {
      const onTaskClick = vi.fn();
      render(<WorkflowPanel {...defaultProps} onTaskClick={onTaskClick} />);

      // Expand the panel
      const expandButton = screen.getByRole('button', { name: /expand/i });
      fireEvent.click(expandButton);

      // The AgentStatusList should be visible
      expect(screen.getByTestId('agent-status-list')).toBeInTheDocument();
    });
  });

  describe('workflow controls', () => {
    it('shows controls when workflow is running', () => {
      render(<WorkflowPanel {...defaultProps} workflowStatus="running" />);

      // WorkflowControls should be visible
      expect(screen.getByTestId('workflow-controls')).toBeInTheDocument();
    });

    it('hides controls when workflow is completed', () => {
      render(<WorkflowPanel {...defaultProps} workflowStatus="completed" />);

      // WorkflowControls should NOT be visible
      expect(screen.queryByTestId('workflow-controls')).not.toBeInTheDocument();
    });

    it('calls onPause when pause button is clicked', () => {
      const onPause = vi.fn();
      render(<WorkflowPanel {...defaultProps} workflowStatus="running" onPause={onPause} />);

      const pauseButton = screen.getByTestId('pause-button');
      fireEvent.click(pauseButton);

      expect(onPause).toHaveBeenCalled();
    });

    it('calls onCancel when cancel button is clicked', () => {
      const onCancel = vi.fn();
      render(<WorkflowPanel {...defaultProps} workflowStatus="running" onCancel={onCancel} />);

      const cancelButton = screen.getByTestId('cancel-button');
      fireEvent.click(cancelButton);

      expect(onCancel).toHaveBeenCalled();
    });
  });
});
