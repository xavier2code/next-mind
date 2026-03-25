'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ApprovalRequest } from '@/lib/approval/types';

/**
 * Props for the ApprovalPrompt component
 */
export interface ApprovalPromptProps {
  /** The approval request to display */
  request: ApprovalRequest;
  /** Callback when user approves the request */
  onApprove: () => Promise<void>;
  /** Callback when user rejects the request */
  onReject: () => Promise<void>;
}

/**
 * Inline approval prompt component for destructive operations.
 *
 * Displays a warning-styled prompt asking the user to approve or cancel
 * a destructive skill operation.
 *
 * @example
 * ```tsx
 * <ApprovalPrompt
 *   request={approvalRequest}
 *   onApprove={async () => { await submitApproval(true); }}
 *   onReject={async () => { await submitApproval(false); }}
 * />
 * ```
 */
export function ApprovalPrompt({ request, onApprove, onReject }: ApprovalPromptProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState<'approve' | 'reject' | null>(null);

  async function handleApprove() {
    setIsLoading(true);
    setLoadingAction('approve');
    try {
      await onApprove();
    } finally {
      setIsLoading(false);
      setLoadingAction(null);
    }
  }

  async function handleReject() {
    setIsLoading(true);
    setLoadingAction('reject');
    try {
      await onReject();
    } finally {
      setIsLoading(false);
      setLoadingAction(null);
    }
  }

  return (
    <div className="border rounded-lg p-4 my-2 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
      {/* Header with warning icon */}
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        <span className="font-semibold text-amber-600 dark:text-amber-400">
          Approval Required
        </span>
      </div>

      {/* Skill name and action */}
      <div className="mb-2">
        <span className="font-medium">{request.skillName}</span>
        <span className="text-zinc-600 dark:text-zinc-300 ml-2">
          {request.action}
        </span>
      </div>

      {/* Details */}
      {request.details && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
          {request.details}
        </p>
      )}

      {/* Action buttons */}
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={handleReject}
          disabled={isLoading}
        >
          {isLoading && loadingAction === 'reject' ? 'Cancelling...' : 'Cancel'}
        </Button>
        <Button
          variant="default"
          onClick={handleApprove}
          disabled={isLoading}
          className="bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-700"
        >
          {isLoading && loadingAction === 'approve' ? 'Approving...' : 'Approve'}
        </Button>
      </div>
    </div>
  );
}

/**
 * Hook for submitting approval decisions to the API.
 *
 * @param requestId - The ID of the approval request
 * @param onSuccess - Callback when approval is successfully submitted
 * @param onError - Callback when an error occurs
 * @returns Object with submit function, loading state, and error state
 */
export function useApprovalDecision(
  requestId: string,
  onSuccess?: (approved: boolean) => void,
  onError?: (error: Error) => void
) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(approved: boolean, reason?: string) {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/approval', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId,
          approved,
          reason,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit approval decision');
      }

      onSuccess?.(approved);
      return data.request;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }

  return {
    submit,
    isLoading,
    error,
  };
}
