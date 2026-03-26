/**
 * Tests for AgentStatusList and AgentTaskRow components
 *
 * VIS-01, VIS-02: Tests for real-time agent status display
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { AgentStatusList, type AgentStatusListProps } from '@/components/workflow/agent-status-list';
import { AgentTaskRow, type AgentTaskRowProps } from '@/components/workflow/agent-task-row';
import type { WaveInfo, TaskInfo } from '@/components/workflow/pipeline-view';
import type { TaskStatus } from '@/components/workflow/task-status-icon';

// Store original EventSource
const OriginalEventSource = global.EventSource;

// Mock EventSource constructor
class MockEventSource {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  close = vi.fn();
  url: string;

  constructor(url: string) {
    this.url = url;
  }
}

describe('AgentTaskRow', () => {
  const createTask = (overrides: Partial<TaskInfo> = {}): TaskInfo => ({
    id: 'task-1',
    description: 'Test task',
    agentType: 'file',
    skillId: 'file-read',
    status: 'running' as TaskStatus,
    ...overrides,
  });

  it('renders task status icon with correct status', () => {
    const task = createTask({ status: 'running' });
    const { container } = render(<AgentTaskRow task={task} />);

    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('displays agent type label in format "[{Type} Agent]"', () => {
    const task = createTask({ agentType: 'file' });
    render(<AgentTaskRow task={task} />);

    expect(screen.getByText(/\[File Agent\]/)).toBeInTheDocument();
  });

  it('shows task description or skill ID', () => {
    const task = createTask({ description: 'My custom task' });
    render(<AgentTaskRow task={task} />);

    expect(screen.getByText('My custom task')).toBeInTheDocument();
  });

  it('shows skill ID when no description', () => {
    const task = createTask({ description: undefined, skillId: 'my-skill' });
    render(<AgentTaskRow task={task} />);

    expect(screen.getByText('my-skill')).toBeInTheDocument();
  });

  it('applies correct styling for running status', () => {
    const task = createTask({ status: 'running' });
    const { container } = render(<AgentTaskRow task={task} />);

    expect(container.querySelector('.bg-blue-50')).toBeInTheDocument();
  });

  it('applies correct styling for completed status', () => {
    const task = createTask({ status: 'completed' });
    const { container } = render(<AgentTaskRow task={task} />);

    expect(container.querySelector('.bg-green-50')).toBeInTheDocument();
  });

  it('applies correct styling for failed status', () => {
    const task = createTask({ status: 'failed' });
    const { container } = render(<AgentTaskRow task={task} />);

    expect(container.querySelector('.bg-red-50')).toBeInTheDocument();
  });

  it('renders with data-testid', () => {
    const task = createTask({ id: 'task-123' });
    render(<AgentTaskRow task={task} />);

    expect(screen.getByTestId('agent-task-row-task-123')).toBeInTheDocument();
  });
});

describe('AgentStatusList', () => {
  const createWave = (waveIndex: number, tasks: TaskInfo[]): WaveInfo => ({
    waveIndex,
    tasks,
  });

  const createTask = (id: string, overrides: Partial<TaskInfo> = {}): TaskInfo => ({
    id,
    description: `Task ${id}`,
    agentType: 'file',
    skillId: `skill-${id}`,
    status: 'pending' as TaskStatus,
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // Set mock EventSource
    global.EventSource = MockEventSource as unknown as typeof OriginalEventSource;
  });

  afterEach(() => {
    // Restore original EventSource
    global.EventSource = OriginalEventSource;
  });

  it('renders empty state when no tasks', () => {
    render(<AgentStatusList waves={[]} />);

    expect(screen.getByTestId('agent-status-list-empty')).toBeInTheDocument();
    expect(screen.getByText('No agents running')).toBeInTheDocument();
  });

  it('renders all tasks from multiple waves as flat list', () => {
    const waves: WaveInfo[] = [
      createWave(0, [
        createTask('task-1', { status: 'completed' }),
        createTask('task-2', { status: 'running' }),
      ]),
      createWave(1, [
        createTask('task-3', { status: 'pending' }),
        createTask('task-4', { status: 'failed' }),
      ]),
    ];

    render(<AgentStatusList waves={waves} />);

    expect(screen.getByTestId('agent-status-list')).toBeInTheDocument();
    expect(screen.getByTestId('agent-task-row-task-1')).toBeInTheDocument();
    expect(screen.getByTestId('agent-task-row-task-2')).toBeInTheDocument();
    expect(screen.getByTestId('agent-task-row-task-3')).toBeInTheDocument();
    expect(screen.getByTestId('agent-task-row-task-4')).toBeInTheDocument();
  });

  it('shows correct status icon for each task status', () => {
    const waves: WaveInfo[] = [
      createWave(0, [
        createTask('task-running', { status: 'running' }),
        createTask('task-completed', { status: 'completed' }),
        createTask('task-failed', { status: 'failed' }),
        createTask('task-pending', { status: 'pending' }),
      ]),
    ];

    const { container } = render(<AgentStatusList waves={waves} />);

    // Running: has animate-spin
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    // Completed: has green icon
    expect(container.querySelector('.text-green-500')).toBeInTheDocument();
    // Failed: has red icon
    expect(container.querySelector('.text-red-500')).toBeInTheDocument();
    // Pending: has gray icon
    expect(container.querySelector('.text-gray-400')).toBeInTheDocument();
  });

  it('displays agent type label for each task', () => {
    const waves: WaveInfo[] = [
      createWave(0, [
        createTask('task-1', { agentType: 'file' }),
        createTask('task-2', { agentType: 'search' }),
        createTask('task-3', { agentType: 'code' }),
      ]),
    ];

    render(<AgentStatusList waves={waves} />);

    expect(screen.getByText(/\[File Agent\]/)).toBeInTheDocument();
    expect(screen.getByText(/\[Search Agent\]/)).toBeInTheDocument();
    expect(screen.getByText(/\[Code Agent\]/)).toBeInTheDocument();
  });

  it('groups tasks by status priority (running first, then pending, then completed/failed)', () => {
    const waves: WaveInfo[] = [
      createWave(0, [
        createTask('task-completed', { status: 'completed' }),
        createTask('task-running', { status: 'running' }),
        createTask('task-failed', { status: 'failed' }),
        createTask('task-pending', { status: 'pending' }),
      ]),
    ];

    const { container } = render(<AgentStatusList waves={waves} />);
    const taskRows = container.querySelectorAll('[data-testid^="agent-task-row-"]');

    // First should be running
    expect(taskRows[0]).toHaveAttribute('data-testid', 'agent-task-row-task-running');
    // Second should be pending
    expect(taskRows[1]).toHaveAttribute('data-testid', 'agent-task-row-task-pending');
    // Third should be completed
    expect(taskRows[2]).toHaveAttribute('data-testid', 'agent-task-row-task-completed');
    // Fourth should be failed
    expect(taskRows[3]).toHaveAttribute('data-testid', 'agent-task-row-task-failed');
  });

  it('shows skill ID for each task', () => {
    const waves: WaveInfo[] = [
      createWave(0, [
        createTask('task-1', { description: undefined, skillId: 'file-read-skill' }),
        createTask('task-2', { description: undefined, skillId: 'web-search-skill' }),
      ]),
    ];

    render(<AgentStatusList waves={waves} />);

    expect(screen.getByText(/file-read-skill/)).toBeInTheDocument();
    expect(screen.getByText(/web-search-skill/)).toBeInTheDocument();
  });

  it('shows header with running and completed count', () => {
    const waves: WaveInfo[] = [
      createWave(0, [
        createTask('task-1', { status: 'running' }),
        createTask('task-2', { status: 'running' }),
        createTask('task-3', { status: 'completed' }),
      ]),
    ];

    render(<AgentStatusList waves={waves} />);

    // The count is in a span, use regex to match partial text
    const statusSpan = screen.getByText(/2 running/);
    expect(statusSpan).toBeInTheDocument();
    expect(statusSpan).toHaveTextContent(/1 completed/);
  });

  it('shows only running count when no completed tasks', () => {
    const waves: WaveInfo[] = [
      createWave(0, [
        createTask('task-1', { status: 'running' }),
      ]),
    ];

    render(<AgentStatusList waves={waves} />);

    expect(screen.getByText('1 running')).toBeInTheDocument();
    expect(screen.queryByText(/completed/)).not.toBeInTheDocument();
  });

  it('shows only completed count when no running tasks', () => {
    const waves: WaveInfo[] = [
      createWave(0, [
        createTask('task-1', { status: 'completed' }),
      ]),
    ];

    render(<AgentStatusList waves={waves} />);

    expect(screen.getByText('1 completed')).toBeInTheDocument();
    expect(screen.queryByText(/running/)).not.toBeInTheDocument();
  });
});
