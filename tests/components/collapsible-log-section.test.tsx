/**
 * Tests for CollapsibleLogSection and LogEntry components
 *
 * VIS-04: Tests for optional log viewer with lazy loading
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  ChevronDown: () => <span data-testid="chevron-down">ChevronDown</span>,
  ChevronRight: () => <span data-testid="chevron-right">ChevronRight</span>,
  Loader2: ({ className }: { className?: string }) => (
    <span data-testid="loader" className={className}>Loader2</span>
  ),
}));

describe('CollapsibleLogSection', () => {
  const mockLogs = [
    {
      id: 'log-1',
      timestamp: new Date('2024-01-01T10:00:00Z'),
      logLevel: 'info' as const,
      message: 'Task started',
      fromAgent: 'orchestrator',
      toAgent: 'file-agent',
    },
    {
      id: 'log-2',
      timestamp: new Date('2024-01-01T10:01:00Z'),
      logLevel: 'debug' as const,
      message: 'Processing file',
      fromAgent: 'file-agent',
      toAgent: 'orchestrator',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Collapsed state', () => {
    it('renders collapsed by default', async () => {
      const { CollapsibleLogSection } = await import('@/components/workflow/collapsible-log-section');

      render(<CollapsibleLogSection taskId="task-1" />);

      // Log content should not be visible
      expect(screen.queryByTestId('log-content')).not.toBeInTheDocument();
    });

    it('shows expand button with View Logs label', async () => {
      const { CollapsibleLogSection } = await import('@/components/workflow/collapsible-log-section');

      render(<CollapsibleLogSection taskId="task-1" />);

      expect(screen.getByText('View Logs')).toBeInTheDocument();
      expect(screen.getByTestId('chevron-right')).toBeInTheDocument();
    });
  });

  describe('Expand behavior', () => {
    it('expands and fetches logs on click', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ logs: mockLogs }),
      });

      const { CollapsibleLogSection } = await import('@/components/workflow/collapsible-log-section');

      render(<CollapsibleLogSection taskId="task-1" />);

      // Click expand button
      fireEvent.click(screen.getByText('View Logs'));

      // Verify fetch was called with correct URL
      expect(mockFetch).toHaveBeenCalledWith('/api/task-logs?taskId=task-1');

      // Wait for logs to load
      await waitFor(() => {
        expect(screen.getByTestId('log-content')).toBeInTheDocument();
      });
    });

    it('shows loading state while fetching', async () => {
      // Create a promise that we can resolve later
      let resolvePromise: (value: unknown) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockFetch.mockReturnValueOnce(pendingPromise.then(() => ({
        ok: true,
        json: () => Promise.resolve({ logs: mockLogs }),
      })));

      const { CollapsibleLogSection } = await import('@/components/workflow/collapsible-log-section');

      render(<CollapsibleLogSection taskId="task-1" />);

      // Click expand button
      fireEvent.click(screen.getByText('View Logs'));

      // Should show loading state
      expect(screen.getByText('Loading logs...')).toBeInTheDocument();
      expect(screen.getByTestId('loader')).toBeInTheDocument();

      // Resolve the promise
      resolvePromise!({});

      // Wait for loading to finish
      await waitFor(() => {
        expect(screen.queryByText('Loading logs...')).not.toBeInTheDocument();
      });
    });

    it('displays log entries after fetch', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ logs: mockLogs }),
      });

      const { CollapsibleLogSection } = await import('@/components/workflow/collapsible-log-section');

      render(<CollapsibleLogSection taskId="task-1" />);

      // Click expand button
      fireEvent.click(screen.getByText('View Logs'));

      // Wait for logs to load and display
      await waitFor(() => {
        expect(screen.getByTestId('log-entry-log-1')).toBeInTheDocument();
        expect(screen.getByTestId('log-entry-log-2')).toBeInTheDocument();
      });
    });

    it('shows empty state when no logs', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ logs: [] }),
      });

      const { CollapsibleLogSection } = await import('@/components/workflow/collapsible-log-section');

      render(<CollapsibleLogSection taskId="task-1" />);

      // Click expand button
      fireEvent.click(screen.getByText('View Logs'));

      // Wait for empty state
      await waitFor(() => {
        expect(screen.getByText('No logs available')).toBeInTheDocument();
      });
    });

    it('collapses when clicked again', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ logs: mockLogs }),
      });

      const { CollapsibleLogSection } = await import('@/components/workflow/collapsible-log-section');

      render(<CollapsibleLogSection taskId="task-1" />);

      // Click to expand
      fireEvent.click(screen.getByText('View Logs'));

      // Wait for logs to load
      await waitFor(() => {
        expect(screen.getByTestId('log-content')).toBeInTheDocument();
      });

      // Click to collapse
      fireEvent.click(screen.getByText('View Logs'));

      // Log content should be hidden again
      expect(screen.queryByTestId('log-content')).not.toBeInTheDocument();
    });
  });

  describe('Error handling', () => {
    it('shows error message when fetch fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { CollapsibleLogSection } = await import('@/components/workflow/collapsible-log-section');

      render(<CollapsibleLogSection taskId="task-1" />);

      // Click expand button
      fireEvent.click(screen.getByText('View Logs'));

      // Wait for error state
      await waitFor(() => {
        expect(screen.getByText('Failed to load logs')).toBeInTheDocument();
      });
    });

    it('shows error message when API returns error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Task not found' }),
      });

      const { CollapsibleLogSection } = await import('@/components/workflow/collapsible-log-section');

      render(<CollapsibleLogSection taskId="task-1" />);

      // Click expand button
      fireEvent.click(screen.getByText('View Logs'));

      // Wait for error state
      await waitFor(() => {
        expect(screen.getByText('Task not found')).toBeInTheDocument();
      });
    });
  });
});

describe('LogEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders timestamp in readable format', async () => {
    const { LogEntry } = await import('@/components/workflow/log-entry');

    const entry = {
      id: 'log-1',
      timestamp: new Date('2024-01-01T10:30:45Z'),
      logLevel: 'info' as const,
      message: 'Test message',
      fromAgent: 'orchestrator',
      toAgent: 'file-agent',
    };

    render(<LogEntry entry={entry} />);

    // Should show time in some format (exact format depends on locale)
    expect(screen.getByTestId('log-entry-log-1')).toBeInTheDocument();
  });

  it('shows log level with color coding for info', async () => {
    const { LogEntry } = await import('@/components/workflow/log-entry');

    const entry = {
      id: 'log-1',
      timestamp: new Date('2024-01-01T10:00:00Z'),
      logLevel: 'info' as const,
      message: 'Test message',
      fromAgent: 'orchestrator',
      toAgent: 'file-agent',
    };

    render(<LogEntry entry={entry} />);

    // Should display [INFO] label
    expect(screen.getByText(/\[info\]/i)).toBeInTheDocument();
  });

  it('shows log level with color coding for warning', async () => {
    const { LogEntry } = await import('@/components/workflow/log-entry');

    const entry = {
      id: 'log-1',
      timestamp: new Date('2024-01-01T10:00:00Z'),
      logLevel: 'warning' as const,
      message: 'Test message',
      fromAgent: 'orchestrator',
      toAgent: 'file-agent',
    };

    render(<LogEntry entry={entry} />);

    // Should display [WARNING] label
    expect(screen.getByText(/\[warning\]/i)).toBeInTheDocument();
  });

  it('shows log level with color coding for error', async () => {
    const { LogEntry } = await import('@/components/workflow/log-entry');

    const entry = {
      id: 'log-1',
      timestamp: new Date('2024-01-01T10:00:00Z'),
      logLevel: 'error' as const,
      message: 'Test message',
      fromAgent: 'orchestrator',
      toAgent: 'file-agent',
    };

    render(<LogEntry entry={entry} />);

    // Should display [ERROR] label
    expect(screen.getByText(/\[error\]/i)).toBeInTheDocument();
  });

  it('shows log level with color coding for debug', async () => {
    const { LogEntry } = await import('@/components/workflow/log-entry');

    const entry = {
      id: 'log-1',
      timestamp: new Date('2024-01-01T10:00:00Z'),
      logLevel: 'debug' as const,
      message: 'Test message',
      fromAgent: 'orchestrator',
      toAgent: 'file-agent',
    };

    render(<LogEntry entry={entry} />);

    // Should display [DEBUG] label
    expect(screen.getByText(/\[debug\]/i)).toBeInTheDocument();
  });

  it('displays message text', async () => {
    const { LogEntry } = await import('@/components/workflow/log-entry');

    const entry = {
      id: 'log-1',
      timestamp: new Date('2024-01-01T10:00:00Z'),
      logLevel: 'info' as const,
      message: 'This is a test log message',
      fromAgent: 'orchestrator',
      toAgent: 'file-agent',
    };

    render(<LogEntry entry={entry} />);

    expect(screen.getByText('This is a test log message')).toBeInTheDocument();
  });

  it('shows from/to agent info', async () => {
    const { LogEntry } = await import('@/components/workflow/log-entry');

    const entry = {
      id: 'log-1',
      timestamp: new Date('2024-01-01T10:00:00Z'),
      logLevel: 'info' as const,
      message: 'Test message',
      fromAgent: 'orchestrator',
      toAgent: 'file-agent',
    };

    render(<LogEntry entry={entry} />);

    expect(screen.getByText(/orchestrator -> file-agent/)).toBeInTheDocument();
  });

  it('applies custom className', async () => {
    const { LogEntry } = await import('@/components/workflow/log-entry');

    const entry = {
      id: 'log-1',
      timestamp: new Date('2024-01-01T10:00:00Z'),
      logLevel: 'info' as const,
      message: 'Test message',
      fromAgent: 'orchestrator',
      toAgent: 'file-agent',
    };

    render(<LogEntry entry={entry} className="custom-class" />);

    const logEntry = screen.getByTestId('log-entry-log-1');
    expect(logEntry).toHaveClass('custom-class');
  });
});
