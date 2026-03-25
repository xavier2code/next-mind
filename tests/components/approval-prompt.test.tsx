import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ApprovalPrompt } from '@/components/chat/approval-prompt';
import type { ApprovalRequest } from '@/lib/approval/types';

// Helper to create a mock approval request
function createMockApprovalRequest(overrides: Partial<ApprovalRequest> = {}): ApprovalRequest {
  return {
    id: 'test-request-id',
    skillId: 'test-skill',
    skillName: 'Test Skill',
    action: 'Delete file',
    details: 'Will permanently delete /path/to/file.txt',
    input: { path: '/path/to/file.txt' },
    status: 'pending',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    userId: 'user-1',
    sessionId: 'session-1',
    ...overrides,
  };
}

describe('ApprovalPrompt Component', () => {
  describe('Test 1: Renders skill name and action description', () => {
    it('should display the skill name', () => {
      const request = createMockApprovalRequest();
      render(
        <ApprovalPrompt
          request={request}
          onApprove={vi.fn()}
          onReject={vi.fn()}
        />
      );

      expect(screen.getByText('Test Skill')).toBeDefined();
    });

    it('should display the action description', () => {
      const request = createMockApprovalRequest({ action: 'Delete all files' });
      render(
        <ApprovalPrompt
          request={request}
          onApprove={vi.fn()}
          onReject={vi.fn()}
        />
      );

      expect(screen.getByText(/Delete all files/)).toBeDefined();
    });

    it('should display approval required header', () => {
      const request = createMockApprovalRequest();
      render(
        <ApprovalPrompt
          request={request}
          onApprove={vi.fn()}
          onReject={vi.fn()}
        />
      );

      expect(screen.getByText(/Approval Required/)).toBeDefined();
    });
  });

  describe('Test 2: Approve button calls onApprove callback', () => {
    it('should call onApprove when approve button is clicked', async () => {
      const request = createMockApprovalRequest();
      const onApprove = vi.fn().mockResolvedValue(undefined);
      const onReject = vi.fn();

      render(
        <ApprovalPrompt
          request={request}
          onApprove={onApprove}
          onReject={onReject}
        />
      );

      const approveButton = screen.getByRole('button', { name: /approve/i });
      fireEvent.click(approveButton);

      await waitFor(() => {
        expect(onApprove).toHaveBeenCalledTimes(1);
        expect(onReject).not.toHaveBeenCalled();
      });
    });
  });

  describe('Test 3: Cancel button calls onReject callback', () => {
    it('should call onReject when cancel button is clicked', async () => {
      const request = createMockApprovalRequest();
      const onApprove = vi.fn().mockResolvedValue(undefined);
      const onReject = vi.fn().mockResolvedValue(undefined);

      render(
        <ApprovalPrompt
          request={request}
          onApprove={onApprove}
          onReject={onReject}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(onReject).toHaveBeenCalledTimes(1);
        expect(onApprove).not.toHaveBeenCalled();
      });
    });
  });

  describe('Test 4: Shows loading state while processing', () => {
    it('should show loading state when approving', async () => {
      const request = createMockApprovalRequest();
      let resolveApprove: () => void;
      const onApprove = vi.fn().mockImplementation(
        () => new Promise<void>((resolve) => {
          resolveApprove = resolve;
        })
      );

      render(
        <ApprovalPrompt
          request={request}
          onApprove={onApprove}
          onReject={vi.fn()}
        />
      );

      const approveButton = screen.getByRole('button', { name: /approve/i });
      fireEvent.click(approveButton);

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByText(/Approving/i)).toBeDefined();
      });

      // Resolve the promise
      resolveApprove!();
    });

    it('should show loading state when cancelling', async () => {
      const request = createMockApprovalRequest();
      let resolveReject: () => void;
      const onReject = vi.fn().mockImplementation(
        () => new Promise<void>((resolve) => {
          resolveReject = resolve;
        })
      );

      render(
        <ApprovalPrompt
          request={request}
          onApprove={vi.fn()}
          onReject={onReject}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByText(/Cancelling/i)).toBeDefined();
      });

      // Resolve the promise
      resolveReject!();
    });
  });

  describe('Test 5: Disables buttons while loading', () => {
    it('should disable both buttons while processing approve', async () => {
      const request = createMockApprovalRequest();
      let resolveApprove: () => void;
      const onApprove = vi.fn().mockImplementation(
        () => new Promise<void>((resolve) => {
          resolveApprove = resolve;
        })
      );

      render(
        <ApprovalPrompt
          request={request}
          onApprove={onApprove}
          onReject={vi.fn()}
        />
      );

      const approveButton = screen.getByRole('button', { name: /approve/i });
      const cancelButton = screen.getByRole('button', { name: /cancel/i });

      // Click approve
      fireEvent.click(approveButton);

      // Wait for loading state
      await waitFor(() => {
        expect(approveButton.hasAttribute('disabled')).toBe(true);
        expect(cancelButton.hasAttribute('disabled')).toBe(true);
      });

      // Resolve the promise
      resolveApprove!();
    });
  });

  describe('Test 6: Displays details text', () => {
    it('should display the details text', () => {
      const request = createMockApprovalRequest({
        details: 'This action cannot be undone. Proceed with caution.',
      });

      render(
        <ApprovalPrompt
          request={request}
          onApprove={vi.fn()}
          onReject={vi.fn()}
        />
      );

      expect(screen.getByText(/This action cannot be undone/)).toBeDefined();
    });

    it('should display destructive actions if present', () => {
      const request = createMockApprovalRequest({
        details: 'Destructive actions: delete, overwrite',
      });

      render(
        <ApprovalPrompt
          request={request}
          onApprove={vi.fn()}
          onReject={vi.fn()}
        />
      );

      expect(screen.getByText(/Destructive actions/)).toBeDefined();
    });
  });
});
