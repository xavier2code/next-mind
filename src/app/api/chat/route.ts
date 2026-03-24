import { auth } from '@/auth';
import { streamChat } from '@/lib/llm';
import { logAudit, getClientInfo } from '@/lib/audit';

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Parse request body
    const body = await req.json();
    const { messages, modelId, conversationId }: {
      messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
      modelId: string;
      conversationId: string;
    } = body;

    if (!messages || !modelId || !conversationId) {
      return new Response('Missing required fields', { status: 400 });
    }

    // Log audit entry
    const clientInfo = getClientInfo(req);
    await logAudit({
      userId: session.user.id,
      action: 'chat_message',
      resource: 'conversation',
      resourceId: conversationId,
      metadata: {
        modelId,
        messageCount: messages.length,
      },
      ...clientInfo,
    });

    // Stream chat completion
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

    // Return streaming response
    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);

    // Check for specific error types
    if (error instanceof Error) {
      if (error.message.includes('API_KEY')) {
        return new Response(
          JSON.stringify({ error: 'LLM service not configured' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
