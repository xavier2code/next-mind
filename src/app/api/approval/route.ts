import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { logAudit, getClientInfo } from '@/lib/audit';
import { logger, generateRequestId } from '@/lib/monitoring';
import { approvalState } from '@/lib/approval/state';
import type { ApprovalRequest, ApprovalDecision } from '@/lib/approval/types';

/**
 * GET /api/approval
 *
 * Returns list of pending approval requests for the current user.
 *
 * Authentication required.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const session = await auth();

  // Authentication check
  if (!session?.user?.id) {
    logger.securityEvent('Unauthenticated approval access', undefined);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;
  logger.apiRequest(requestId, 'GET', '/api/approval', userId);

  try {
    // Get pending approvals for this user
    const approvals = approvalState.getPendingApprovals(userId);

    // Cleanup old expired requests periodically
    approvalState.cleanup();

    logger.apiResponse(requestId, 'GET', '/api/approval', 200, 0);

    return NextResponse.json({ approvals });
  } catch (error) {
    logger.error(
      'api',
      'Error fetching approvals',
      error instanceof Error ? error : undefined,
      { requestId, userId }
    );

    return NextResponse.json({ error: 'Failed to fetch approvals' }, { status: 500 });
  }
}

/**
 * POST /api/approval
 *
 * Submit an approval decision (approve or reject).
 *
 * Request body:
 * - requestId: string - ID of the approval request
 * - approved: boolean - Whether to approve or reject
 * - reason?: string - Optional reason for rejection
 *
 * Authentication required.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const session = await auth();

  // Authentication check
  if (!session?.user?.id) {
    logger.securityEvent('Unauthenticated approval decision', undefined);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;
  logger.apiRequest(requestId, 'POST', '/api/approval', userId);

  try {
    // Parse request body
    const body: ApprovalDecision = await request.json();
    const { requestId: bodyRequestId, approved, reason } = body;

    // Validate required fields
    if (!bodyRequestId || typeof approved !== 'boolean') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request: requestId and approved are required',
        },
        { status: 400 }
      );
    }

    // Get the approval request
    const approvalRequest = approvalState.getRequest(bodyRequestId);

    if (!approvalRequest) {
      return NextResponse.json(
        {
          success: false,
          error: 'Approval request not found',
        },
        { status: 404 }
      );
    }

    // Verify ownership - user must own the request
    if (approvalRequest.userId !== userId) {
      logger.securityEvent('Unauthorized approval access', userId, {
        requestId: bodyRequestId,
        ownerUserId: approvalRequest.userId,
      });

      return NextResponse.json(
        {
          success: false,
          error: 'You are not authorized to approve this request',
        },
        { status: 403 }
      );
    }

    // Process the decision
    let updatedRequest: ApprovalRequest | null;
    if (approved) {
      updatedRequest = approvalState.approve(bodyRequestId);
    } else {
      updatedRequest = approvalState.reject(bodyRequestId, reason);
    }

    if (!updatedRequest) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to process approval decision. Request may already be processed.',
        },
        { status: 400 }
      );
    }

    // Log audit for approval decision
    await logAudit({
      userId,
      action: approved ? 'approval_granted' : 'approval_rejected',
      resource: 'approval',
      resourceId: bodyRequestId,
      metadata: {
        skillId: approvalRequest.skillId,
        skillName: approvalRequest.skillName,
        approved,
        reason,
      },
      ...getClientInfo(request),
    });

    logger.info('security', `Approval ${approved ? 'granted' : 'rejected'}`, {
      userId,
      metadata: {
        requestId: bodyRequestId,
        skillId: approvalRequest.skillId,
      },
    });

    logger.apiResponse(requestId, 'POST', '/api/approval', 200, 0);

    return NextResponse.json({
      success: true,
      request: updatedRequest,
    });
  } catch (error) {
    logger.error(
      'api',
      'Error processing approval decision',
      error instanceof Error ? error : undefined,
      { requestId, userId }
    );

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process approval decision',
      },
      { status: 500 }
    );
  }
}
