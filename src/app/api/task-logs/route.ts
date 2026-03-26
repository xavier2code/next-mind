import { NextRequest, NextResponse } from 'next/server';
import { getTaskLogs } from '@/lib/db/queries';

/**
 * GET /api/task-logs?taskId=xxx
 * VIS-04: Fetch agent execution logs for a task.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get('taskId');

  if (!taskId) {
    return NextResponse.json(
      { error: 'Missing taskId parameter' },
      { status: 400 }
    );
  }

  try {
    const logs = await getTaskLogs(taskId);
    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Failed to fetch task logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch logs' },
      { status: 500 }
    );
  }
}
