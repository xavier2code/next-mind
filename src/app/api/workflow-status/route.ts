import { NextRequest } from 'next/server';
import {
  addWorkflowListener,
  removeWorkflowListener,
  broadcastWorkflowUpdate,
  getListenerCount
} from '@/lib/agents/status-broadcaster';
import type { WorkflowStatusUpdate } from '@/lib/agents/status-broadcaster';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const workflowId = searchParams.get('workflowId');

  if (!workflowId) {
    return new Response('Missing workflowId parameter', { status: 400 });
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Send initial connection message
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'connected', workflowId })}\n\n`)
      );

      // Register listener for workflow updates
      const listener = (data: string) => {
        try {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch {
          // Stream closed, listener will be cleaned up
        }
      };

      addWorkflowListener(workflowId, listener);

      // Heartbeat to prevent Vercel timeout (25s limit)
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch {
          // Stream closed, listener will be cleaned up
          clearInterval(heartbeat);
        }
      }, 15000);

      // Cleanup on disconnect
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        removeWorkflowListener(workflowId, listener);
        try {
          controller.close();
        } catch {
          // Stream closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
