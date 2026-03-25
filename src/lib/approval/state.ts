import { randomUUID } from 'crypto';
import { logAudit } from '@/lib/audit';
import type {
  ApprovalRequest,
  ApprovalStatus,
  CreateApprovalRequestParams,
} from './types';

// Re-export types
export type { ApprovalRequest, ApprovalStatus, ApprovalDecision, CreateApprovalRequestParams } from './types';

/**
 * Default timeout for approval requests (5 minutes)
 */
const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Time to keep expired requests before cleanup (1 hour)
 */
const CLEANUP_AGE_MS = 60 * 60 * 1000;

/**
 * State machine for managing approval requests.
 *
 * Handles the lifecycle of approval requests from creation through
 * approval/rejection/expiration.
 */
export class ApprovalStateMachine {
  private requests: Map<string, ApprovalRequest> = new Map();
  private readonly timeoutMs: number;

  /**
   * Create a new approval state machine.
   *
   * @param timeoutMs - Timeout for approval requests (default 5 minutes)
   */
  constructor(timeoutMs: number = DEFAULT_TIMEOUT_MS) {
    this.timeoutMs = timeoutMs;
  }

  /**
   * Create a new approval request.
   *
   * @param params - Request parameters (excluding auto-generated fields)
   * @returns The created approval request
   */
  createRequest(params: CreateApprovalRequestParams): ApprovalRequest {
    const now = new Date();
    const request: ApprovalRequest = {
      id: randomUUID(),
      skillId: params.skillId,
      skillName: params.skillName,
      action: params.action,
      details: params.details,
      input: params.input,
      status: 'pending',
      createdAt: now,
      expiresAt: new Date(now.getTime() + this.timeoutMs),
      userId: params.userId,
      sessionId: params.sessionId,
    };

    this.requests.set(request.id, request);
    return request;
  }

  /**
   * Approve a pending request.
   *
   * @param requestId - ID of the request to approve
   * @returns The updated request, or null if not found or not pending
   */
  approve(requestId: string): ApprovalRequest | null {
    const request = this.requests.get(requestId);

    if (!request || request.status !== 'pending') {
      return null;
    }

    // Check if expired
    if (request.expiresAt < new Date()) {
      request.status = 'expired';
      return null;
    }

    request.status = 'approved';

    // Log audit entry (fire-and-forget)
    logAudit({
      userId: request.userId,
      action: 'approval_approved',
      resource: 'approval_request',
      resourceId: request.id,
      metadata: {
        skillId: request.skillId,
        skillName: request.skillName,
      },
    }).catch(() => {
      // Log error but don't fail
    });

    return request;
  }

  /**
   * Reject a pending request.
   *
   * @param requestId - ID of the request to reject
   * @param reason - Optional reason for rejection
   * @returns The updated request, or null if not found or not pending
   */
  reject(requestId: string, reason?: string): ApprovalRequest | null {
    const request = this.requests.get(requestId);

    if (!request || request.status !== 'pending') {
      return null;
    }

    // Check if expired
    if (request.expiresAt < new Date()) {
      request.status = 'expired';
      return null;
    }

    request.status = 'rejected';

    // Log audit entry (fire-and-forget)
    logAudit({
      userId: request.userId,
      action: 'approval_rejected',
      resource: 'approval_request',
      resourceId: request.id,
      metadata: {
        skillId: request.skillId,
        skillName: request.skillName,
        reason,
      },
    }).catch(() => {
      // Log error but don't fail
    });

    return request;
  }

  /**
   * Get a request by ID.
   *
   * @param requestId - ID of the request
   * @returns The request, or undefined if not found
   */
  getRequest(requestId: string): ApprovalRequest | undefined {
    return this.requests.get(requestId);
  }

  /**
   * Get all pending approval requests for a user.
   *
   * Excludes expired requests.
   *
   * @param userId - User ID to filter by
   * @returns Array of pending approval requests
   */
  getPendingApprovals(userId: string): ApprovalRequest[] {
    const now = new Date();

    return Array.from(this.requests.values()).filter((request) => {
      return (
        request.userId === userId &&
        request.status === 'pending' &&
        request.expiresAt >= now
      );
    });
  }

  /**
   * Clean up old expired requests.
   *
   * Removes requests that have been expired for more than 1 hour.
   * Should be called periodically or on access.
   */
  cleanup(): void {
    const cutoff = new Date(Date.now() - CLEANUP_AGE_MS);

    for (const [id, request] of this.requests) {
      if (request.status === 'expired' && request.expiresAt < cutoff) {
        this.requests.delete(id);
      }
      // Also mark pending requests as expired if past their expiry
      if (request.status === 'pending' && request.expiresAt < new Date()) {
        request.status = 'expired';
      }
    }
  }
}

/**
 * Global approval state instance.
 *
 * Use this for most approval operations.
 */
export const approvalState = new ApprovalStateMachine();

/**
 * Create an approval request using the global state.
 *
 * Convenience wrapper around approvalState.createRequest().
 *
 * @param params - Request parameters
 * @returns The created approval request
 */
export function createApprovalRequest(
  params: CreateApprovalRequestParams
): ApprovalRequest {
  return approvalState.createRequest(params);
}
