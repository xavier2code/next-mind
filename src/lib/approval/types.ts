/**
 * Approval flow type definitions
 *
 * Types for managing approval requests for destructive skill operations.
 */

/**
 * Status of an approval request
 */
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired';

/**
 * Approval request for a destructive operation
 */
export interface ApprovalRequest {
  /** Unique identifier for the request */
  id: string;
  /** ID of the skill requiring approval */
  skillId: string;
  /** Display name of the skill */
  skillName: string;
  /** Description of the action to be performed */
  action: string;
  /** Additional context about the operation */
  details: string;
  /** Input that will be passed to the skill */
  input: unknown;
  /** Current status of the request */
  status: ApprovalStatus;
  /** When the request was created */
  createdAt: Date;
  /** When the request expires */
  expiresAt: Date;
  /** User who needs to approve */
  userId: string;
  /** Session ID for the request */
  sessionId: string;
}

/**
 * Decision submitted for an approval request
 */
export interface ApprovalDecision {
  /** ID of the approval request */
  requestId: string;
  /** Whether the request was approved */
  approved: boolean;
  /** Optional reason for rejection */
  reason?: string;
}

/**
 * Parameters for creating an approval request
 */
export type CreateApprovalRequestParams = Omit<
  ApprovalRequest,
  'id' | 'status' | 'createdAt' | 'expiresAt'
>;
