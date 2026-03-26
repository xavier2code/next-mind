/**
 * Tests for WorkflowProgress component
 *
 * VIS-03: Tests for progress bar with percentage display
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { WorkflowProgress } from '@/components/workflow/workflow-progress';
import type { WaveInfo } from '@/components/workflow/pipeline-view';

describe('WorkflowProgress', () => {
  // Test 1: Renders progress bar with 0% when no tasks completed
  it('renders progress bar with 0% when no tasks completed', () => {
    const waves: WaveInfo[] = [
      {
        waveIndex: 0,
        tasks: [
          { id: 'task-1', description: 'Task 1', agentType: 'file', skillId: 'file-read', status: 'pending' },
          { id: 'task-2', description: 'Task 2', agentType: 'search', skillId: 'web-search', status: 'running' },
          { id: 'task-3', description: 'Task 3', agentType: 'code', skillId: 'code-gen', status: 'pending' },
        ],
      },
    ];

    render(<WorkflowProgress waves={waves} />);

    // Check progress bar width is 0%
    const progressFill = screen.getByTestId('workflow-progress').querySelector('[style*="width"]');
    expect(progressFill).toHaveStyle({ width: '0%' });

    // Check label shows 0/3 tasks completed (0%)
    expect(screen.getByText('0/3 tasks completed (0%)')).toBeInTheDocument();
  });

  // Test 2: Renders progress bar with 50% when half tasks completed
  it('renders progress bar with 50% when half tasks completed', () => {
    const waves: WaveInfo[] = [
      {
        waveIndex: 0,
        tasks: [
          { id: 'task-1', description: 'Task 1', agentType: 'file', skillId: 'file-read', status: 'completed' },
          { id: 'task-2', description: 'Task 2', agentType: 'search', skillId: 'web-search', status: 'completed' },
        ],
      },
      {
        waveIndex: 1,
        tasks: [
          { id: 'task-3', description: 'Task 3', agentType: 'code', skillId: 'code-gen', status: 'pending' },
          { id: 'task-4', description: 'Task 4', agentType: 'test', skillId: 'test-gen', status: 'running' },
        ],
      },
    ];

    render(<WorkflowProgress waves={waves} />);

    // Check progress bar width is 50%
    const progressFill = screen.getByTestId('workflow-progress').querySelector('[style*="width"]');
    expect(progressFill).toHaveStyle({ width: '50%' });

    // Check label shows 2/4 tasks completed (50%)
    expect(screen.getByText('2/4 tasks completed (50%)')).toBeInTheDocument();
  });

  // Test 3: Renders progress bar with 100% when all tasks completed
  it('renders progress bar with 100% when all tasks completed', () => {
    const waves: WaveInfo[] = [
      {
        waveIndex: 0,
        tasks: [
          { id: 'task-1', description: 'Task 1', agentType: 'file', skillId: 'file-read', status: 'completed' },
          { id: 'task-2', description: 'Task 2', agentType: 'search', skillId: 'web-search', status: 'completed' },
        ],
      },
      {
        waveIndex: 1,
        tasks: [
          { id: 'task-3', description: 'Task 3', agentType: 'code', skillId: 'code-gen', status: 'completed' },
          { id: 'task-4', description: 'Task 4', agentType: 'test', skillId: 'test-gen', status: 'completed' },
        ],
      },
    ];

    render(<WorkflowProgress waves={waves} />);

    // Check progress bar width is 100%
    const progressFill = screen.getByTestId('workflow-progress').querySelector('[style*="width"]');
    expect(progressFill).toHaveStyle({ width: '100%' });

    // Check label shows 4/4 tasks completed (100%)
    expect(screen.getByText('4/4 tasks completed (100%)')).toBeInTheDocument();
  });

  // Test 4: Displays correct label format
  it('displays correct label format', () => {
    const waves: WaveInfo[] = [
      {
        waveIndex: 0,
        tasks: [
          { id: 'task-1', description: 'Task 1', agentType: 'file', skillId: 'file-read', status: 'completed' },
          { id: 'task-2', description: 'Task 2', agentType: 'search', skillId: 'web-search', status: 'pending' },
          { id: 'task-3', description: 'Task 3', agentType: 'code', skillId: 'code-gen', status: 'pending' },
          { id: 'task-4', description: 'Task 4', agentType: 'test', skillId: 'test-gen', status: 'pending' },
        ],
      },
    ];

    render(<WorkflowProgress waves={waves} />);

    // D-10: Label format: "{completed}/{total} tasks completed ({percentage}%)"
    expect(screen.getByText('1/4 tasks completed (25%)')).toBeInTheDocument();
  });

  // Test 5: Progress bar has correct ARIA attributes
  it('progress bar has correct ARIA attributes', () => {
    const waves: WaveInfo[] = [
      {
        waveIndex: 0,
        tasks: [
          { id: 'task-1', description: 'Task 1', agentType: 'file', skillId: 'file-read', status: 'completed' },
          { id: 'task-2', description: 'Task 2', agentType: 'search', skillId: 'web-search', status: 'completed' },
          { id: 'task-3', description: 'Task 3', agentType: 'code', skillId: 'code-gen', status: 'pending' },
          { id: 'task-4', description: 'Task 4', agentType: 'test', skillId: 'test-gen', status: 'pending' },
        ],
      },
    ];

    render(<WorkflowProgress waves={waves} />);

    // Check role="progressbar"
    const progressbar = screen.getByRole('progressbar');
    expect(progressbar).toBeInTheDocument();

    // Check aria-valuenow is 50
    expect(progressbar).toHaveAttribute('aria-valuenow', '50');

    // Check aria-valuemin is 0
    expect(progressbar).toHaveAttribute('aria-valuemin', '0');

    // Check aria-valuemax is 100
    expect(progressbar).toHaveAttribute('aria-valuemax', '100');
  });

  // Test 6: Progress bar shows green color when 100% complete
  it('progress bar shows green color when 100% complete', () => {
    const waves: WaveInfo[] = [
      {
        waveIndex: 0,
        tasks: [
          { id: 'task-1', description: 'Task 1', agentType: 'file', skillId: 'file-read', status: 'completed' },
          { id: 'task-2', description: 'Task 2', agentType: 'search', skillId: 'web-search', status: 'completed' },
        ],
      },
    ];

    render(<WorkflowProgress waves={waves} workflowStatus="completed" />);

    // Check fill color is bg-green-600
    const progressFill = screen.getByTestId('workflow-progress').querySelector('[style*="width"]');
    expect(progressFill).toHaveClass('bg-green-600');
  });

  // Test 7: Progress bar shows red color when workflow status is 'failed'
  it('progress bar shows red color when workflow status is failed', () => {
    const waves: WaveInfo[] = [
      {
        waveIndex: 0,
        tasks: [
          { id: 'task-1', description: 'Task 1', agentType: 'file', skillId: 'file-read', status: 'completed' },
          { id: 'task-2', description: 'Task 2', agentType: 'search', skillId: 'web-search', status: 'failed' },
        ],
      },
    ];

    render(<WorkflowProgress waves={waves} workflowStatus="failed" />);

    // Check fill color is bg-destructive
    const progressFill = screen.getByTestId('workflow-progress').querySelector('[style*="width"]');
    expect(progressFill).toHaveClass('bg-destructive');
  });

  // Test 8: Handles empty waves array
  it('handles empty waves array', () => {
    render(<WorkflowProgress waves={[]} />);

    // Check progress bar width is 0%
    const progressFill = screen.getByTestId('workflow-progress').querySelector('[style*="width"]');
    expect(progressFill).toHaveStyle({ width: '0%' });

    // Check label shows 0/0 tasks completed (0%)
    expect(screen.getByText('0/0 tasks completed (0%)')).toBeInTheDocument();
  });

  // Test 9: Uses primary color for running/in-progress state
  it('uses primary color for running/in-progress state', () => {
    const waves: WaveInfo[] = [
      {
        waveIndex: 0,
        tasks: [
          { id: 'task-1', description: 'Task 1', agentType: 'file', skillId: 'file-read', status: 'completed' },
          { id: 'task-2', description: 'Task 2', agentType: 'search', skillId: 'web-search', status: 'running' },
        ],
      },
    ];

    render(<WorkflowProgress waves={waves} workflowStatus="running" />);

    // Check fill color is bg-primary
    const progressFill = screen.getByTestId('workflow-progress').querySelector('[style*="width"]');
    expect(progressFill).toHaveClass('bg-primary');
  });

  // Test 10: Applies custom className
  it('applies custom className', () => {
    const waves: WaveInfo[] = [
      {
        waveIndex: 0,
        tasks: [
          { id: 'task-1', description: 'Task 1', agentType: 'file', skillId: 'file-read', status: 'completed' },
        ],
      },
    ];

    render(<WorkflowProgress waves={waves} className="custom-class" />);

    // Check custom class is applied
    const container = screen.getByTestId('workflow-progress');
    expect(container).toHaveClass('custom-class');
  });
});
