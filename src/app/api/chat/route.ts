import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { streamChat } from '@/lib/llm';
import { logAudit, getClientInfo } from '@/lib/audit';
import { checkMessagesSafety } from '@/lib/content-filter';
import { logger, generateRequestId } from '@/lib/monitoring';

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  // Authenticate user
  const session = await auth();
  if (!session?.user?.id) {
    logger.apiRequest(requestId, 'POST', '/api/chat');
    logger.securityEvent('Unauthenticated chat attempt', undefined);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;
  logger.apiRequest(requestId, 'POST', '/api/chat', userId);

  try {
    const body = await request.json();
    const { messages, modelId, conversationId }: {
      messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
      modelId: string;
      conversationId: string;
    } = body;

    // Validate request
    if (!messages || !Array.isArray(messages)) {
      logger.error('api', 'Invalid messages format', undefined, { requestId, userId });
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    if (!modelId || !conversationId) {
      return NextResponse.json(
        { error: 'modelId and conversationId are required' },
        { status: 400 }
      );
    }

    // Content safety check
    const safetyResult = checkMessagesSafety(messages.map(m => ({ content: m.content })));
    if (!safetyResult.safe) {
      logger.securityEvent('Content blocked', userId, {
        requestId,
        reason: safetyResult.reason,
        conversationId,
      });

      await logAudit({
        userId,
        action: 'content_blocked',
        resource: 'chat',
        resourceId: conversationId,
        metadata: { reason: safetyResult.reason },
        ...getClientInfo(request),
      });

      return NextResponse.json(
        { error: safetyResult.reason || 'Content not allowed' },
        { status: 400 }
      );
    }

    // Log state for debugging (only in development)
    logger.debug('chat', 'Conversation state', {
      requestId,
      conversationId,
      messageCount: messages.length,
    });

    // Audit log
    await logAudit({
      userId,
      action: 'chat_message',
      resource: 'conversation',
      resourceId: conversationId,
      metadata: { modelId, messageCount: messages.length },
      ...getClientInfo(request),
    });

    // Stream chat
    const eventStream = await streamChat({
      modelId: modelId || 'qwen3.5-turbo',
      messages,
      systemPrompt: 'You are a helpful AI assistant for a team collaboration platform. Respond in the language the user uses.',
    });

    // Convert event stream to ReadableStream for Response
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of eventStream) {
            if (event.type === 'text_delta') {
              controller.enqueue(new TextEncoder().encode(event.delta));
            }
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    const durationMs = Date.now() - startTime;
    logger.apiResponse(requestId, 'POST', '/api/chat', 200, durationMs);

    // Return streaming response
    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    logger.error(
      'api',
      'Chat API error',
      error instanceof Error ? error : new Error(String(error)),
      { requestId, userId, durationMs }
    );

    logger.apiResponse(requestId, 'POST', '/api/chat', 500, durationMs);

    // Check for specific error types
    if (error instanceof Error && error.message.includes('API_KEY')) {
      return NextResponse.json(
        { error: 'LLM service not configured' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
