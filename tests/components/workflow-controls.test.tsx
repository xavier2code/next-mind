/**
 * Tests for Workflow Control UI Components
 *
 * CTRL-01: User can pause/resume/cancel workflow via UI
 * RSLT-05: Source labels show agent type and skill ID
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WorkflowStatusBadge, type WorkflowStatus } from '@/components/workflow/workflow-status-badge';
import { CancelConfirmationDialog } from '@/components/workflow/cancel-confirmation-dialog';
import { WorkflowControls } from '@/components/workflow/workflow-controls';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('WorkflowStatusBadge', () => {
  it('renders with running status and blue color', () => {
    render(<WorkflowStatusBadge status="running" />);
    const badge = screen.getByTestId('workflow-status-badge');
    expect(badge).toHaveTextContent('Running');
    expect(badge).toHaveClass('bg-blue-100');
  });

  it('renders with paused status and amber color', () => {
    render(<WorkflowStatusBadge status="paused" />);
    const badge = screen.getByTestId('workflow-status-badge');
    expect(badge).toHaveTextContent('Paused');
    expect(badge).toHaveClass('bg-amber-100');
  });

  it('renders with completed status and green color', () => {
    render(<WorkflowStatusBadge status="completed" />);
    const badge = screen.getByTestId('workflow-status-badge');
    expect(badge).toHaveTextContent('Completed');
    expect(badge).toHaveClass('bg-green-100');
  });

  it('renders with failed status and red color', () => {
    render(<WorkflowStatusBadge status="failed" />);
    const badge = screen.getByTestId('workflow-status-badge');
    expect(badge).toHaveTextContent('Failed');
    expect(badge).toHaveClass('bg-red-100');
  });

  it('renders with cancelled status and gray color', () => {
    render(<WorkflowStatusBadge status="cancelled" />);
    const badge = screen.getByTestId('workflow-status-badge');
    expect(badge).toHaveTextContent('Cancelled');
    expect(badge).toHaveClass('bg-gray-100');
  });

  it('renders with pausing status and blue color', () => {
    render(<WorkflowStatusBadge status="pausing" />);
    const badge = screen.getByTestId('workflow-status-badge');
    expect(badge).toHaveTextContent('Pausing...');
    expect(badge).toHaveClass('bg-blue-100');
  });

  it('applies custom className', () => {
    render(<WorkflowStatusBadge status="running" className="custom-class" />);
    const badge = screen.getByTestId('workflow-status-badge');
    expect(badge).toHaveClass('custom-class');
  });
});

describe('CancelConfirmationDialog', () => {
  it('renders dialog with correct title and description', () => {
    render(
      <CancelConfirmationDialog
        open={true}
        onOpenChange={() => {}}
        onConfirm={() => {}}
      />
    );

    expect(screen.getByText('Cancel Workflow')).toBeInTheDocument();
    expect(screen.getByText(/Are you sure\?/)).toBeInTheDocument();
    expect(screen.getByText(/cannot be undone/)).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button clicked', async () => {
    const onConfirm = vi.fn();
    render(
      <CancelConfirmationDialog
        open={true}
        onOpenChange={() => {}}
        onConfirm={onConfirm}
      />
    );

    const confirmButton = screen.getByTestId('cancel-dialog-confirm');
    fireEvent.click(confirmButton);

    expect(onConfirm).toHaveBeenCalled();
  });

  it('closes dialog when cancel button clicked', () => {
    const onOpenChange = vi.fn();
    render(
      <CancelConfirmationDialog
        open={true}
        onOpenChange={onOpenChange}
        onConfirm={() => {}}
      />
    );

    const dismissButton = screen.getByTestId('cancel-dialog-dismiss');
    fireEvent.click(dismissButton);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('shows loading state on confirm button', () => {
    render(
      <CancelConfirmationDialog
        open={true}
        onOpenChange={() => {}}
        onConfirm={() => {}}
        isLoading={true}
      />
    );

    const confirmButton = screen.getByTestId('cancel-dialog-confirm');
    expect(confirmButton).toHaveTextContent('Cancelling...');
    expect(confirmButton).toBeDisabled();
  });
});

describe('WorkflowControls', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Pause button visibility', () => {
    it('shows Pause button when status is running', () => {
      render(
        <WorkflowControls
          workflowId="workflow-123"
          status="running"
        />
      );

      expect(screen.getByTestId('pause-button')).toBeInTheDocument();
    });

    it('hides Pause button when status is paused', () => {
      render(
        <WorkflowControls
          workflowId="workflow-123"
          status="paused"
        />
      );

      expect(screen.queryByTestId('pause-button')).not.toBeInTheDocument();
    });

    it('hides Pause button when status is completed', () => {
      render(
        <WorkflowControls
          workflowId="workflow-123"
          status="completed"
        />
      );

      expect(screen.queryByTestId('pause-button')).not.toBeInTheDocument();
    });
  });

  describe('Resume button visibility', () => {
    it('shows Resume button when status is paused', () => {
      render(
        <WorkflowControls
          workflowId="workflow-123"
          status="paused"
        />
      );

      expect(screen.getByTestId('resume-button')).toBeInTheDocument();
    });

    it('hides Resume button when status is running', () => {
      render(
        <WorkflowControls
          workflowId="workflow-123"
          status="running"
        />
      );

      expect(screen.queryByTestId('resume-button')).not.toBeInTheDocument();
    });
  });

  describe('Cancel button visibility', () => {
    it('shows Cancel button when status is running', () => {
      render(
        <WorkflowControls
          workflowId="workflow-123"
          status="running"
        />
      );

      expect(screen.getByTestId('cancel-button')).toBeInTheDocument();
    });

    it('shows Cancel button when status is paused', () => {
      render(
        <WorkflowControls
          workflowId="workflow-123"
          status="paused"
        />
      );

      expect(screen.getByTestId('cancel-button')).toBeInTheDocument();
    });

    it('shows Cancel button when status is pausing', () => {
      render(
        <WorkflowControls
          workflowId="workflow-123"
          status="pausing"
        />
      );

      expect(screen.getByTestId('cancel-button')).toBeInTheDocument();
    });

    it('hides Cancel button when status is completed', () => {
      render(
        <WorkflowControls
          workflowId="workflow-123"
          status="completed"
        />
      );

      expect(screen.queryByTestId('cancel-button')).not.toBeInTheDocument();
    });
  });

  describe('API calls', () => {
    it('calls /api/workflow-control with pause action on Pause click', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, status: 'pausing' }),
      });

      render(
        <WorkflowControls
          workflowId="workflow-123"
          status="running"
        />
      );

      const pauseButton = screen.getByTestId('pause-button');
      fireEvent.click(pauseButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/workflow-control', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workflowId: 'workflow-123', action: 'pause' }),
        });
      });
    });

    it('calls /api/workflow-control with resume action on Resume click', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, status: 'running' }),
      });

      render(
        <WorkflowControls
          workflowId="workflow-123"
          status="paused"
        />
      );

      const resumeButton = screen.getByTestId('resume-button');
      fireEvent.click(resumeButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/workflow-control', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workflowId: 'workflow-123', action: 'resume' }),
        });
      });
    });

    it('shows cancel confirmation on Cancel click', () => {
      render(
        <WorkflowControls
          workflowId="workflow-123"
          status="running"
        />
      );

      const cancelButton = screen.getByTestId('cancel-button');
      fireEvent.click(cancelButton);

      expect(screen.getByText('Cancel Workflow')).toBeInTheDocument();
    });

    it('updates status after successful action', async () => {
      const onStatusChange = vi.fn();
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, status: 'pausing' }),
      });

      render(
        <WorkflowControls
          workflowId="workflow-123"
          status="running"
          onStatusChange={onStatusChange}
        />
      );

      const pauseButton = screen.getByTestId('pause-button');
      fireEvent.click(pauseButton);

      await waitFor(() => {
        expect(onStatusChange).toHaveBeenCalledWith('pausing');
      });
    });
  });
});
