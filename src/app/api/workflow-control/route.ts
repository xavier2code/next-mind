/**
 * Workflow Control API
 *
 * REST endpoint for pause/resume/cancel operations.
 * CTRL-01, CTRL-02, CTRL-05.
 */
import { NextRequest, NextResponse } from 'next/server';
import {
  pauseWorkflow,
  resumeWorkflow,
  cancelWorkflowController,
  validateControlAction,
  type WorkflowControlAction,
} from '@/lib/agents/workflow-controller';
import { getWorkflow, getTasksByWorkflow } from '@/lib/db/queries';
import { auth } from '@/auth';

/**
 * POST /api/workflow-control
 *
 * Body: { workflowId: string, action: 'pause' | 'resume' | 'cancel' }
 *
 * D-01: Control actions triggered via API calls from Pipeline UI.
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { workflowId, action } = body as { workflowId: string; action: WorkflowControlAction };

    if (!workflowId || !action) {
      return NextResponse.json(
        { error: 'Missing workflowId or action' },
        { status: 400 }
      );
    }

    if (!['pause', 'resume', 'cancel'].includes(action)) {
      return NextResponse.json(
        { error: `Invalid action: ${action}` },
        { status: 400 }
      );
    }

    // Get current workflow status
    const workflow = await getWorkflow(workflowId);
    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    // Validate action is allowed
    const validation = validateControlAction(workflow.status as 'pending' | 'running' | 'pausing' | 'paused' | 'completed' | 'failed' | 'cancelled', action);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Execute action
    let result;
    switch (action) {
      case 'pause':
        result = await pauseWorkflow(workflowId);
        break;
      case 'resume':
        // Load tasks for resume
        const tasks = await getTasksByWorkflow(workflowId);
        // Convert to TaskWithDependencies format
        const tasksWithDeps = tasks.map(t => ({
          id: t.id,
          agentType: t.agentType as 'file' | 'search' | 'code' | 'custom',
          skillId: t.skillId,
          input: t.input,
          dependencies: [], // Dependencies would need to be stored/retrieved
        }));
        result = await resumeWorkflow(workflowId, tasksWithDeps, {
          userId: session.user.id,
          sessionId: session.user.id, // Simplified for now
        });
        break;
      case 'cancel':
        result = await cancelWorkflowController(workflowId);
        break;
    }

    return NextResponse.json({
      success: result!.success,
      status: result!.status,
      error: result!.error,
    });

  } catch (error) {
    console.error('Workflow control error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
