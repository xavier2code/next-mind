import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { conversations } from '@/lib/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { logAudit, getClientInfo } from '@/lib/audit';
import { logger, generateRequestId } from '@/lib/monitoring';

// GET /api/conversations - List conversations with search
export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  const session = await auth();

  if (!session?.user?.id) {
    logger.securityEvent('Unauthenticated conversations access', undefined);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;
  logger.apiRequest(requestId, 'GET', '/api/conversations', userId);

  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get('search');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  try {
    // List all conversations (search without full-text for now)
    const result = await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.updatedAt))
      .limit(limit)
      .offset(offset);

    // Filter by search if provided
    const filtered = search
      ? result.filter(c => c.title.toLowerCase().includes(search.toLowerCase()))
      : result;

    if (search) {
      await logAudit({
        userId,
        action: 'conversation_search',
        resource: 'conversation',
        metadata: { search, results: filtered.length },
        ...getClientInfo(request),
      });
    }

    logger.apiResponse(requestId, 'GET', '/api/conversations', 200, 0);

    return NextResponse.json({ conversations: filtered });
  } catch (error) {
    logger.error('api', 'Error fetching conversations', error instanceof Error ? error : undefined, {
      requestId,
      userId,
    });

    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}

// POST /api/conversations - Create new conversation
export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;
  logger.apiRequest(requestId, 'POST', '/api/conversations', userId);

  try {
    const { title, modelId } = await request.json();

    const [conversation] = await db
      .insert(conversations)
      .values({
        userId,
        title: title || 'New conversation',
        modelId: modelId || 'qwen3.5-turbo',
      })
      .returning();

    await logAudit({
      userId,
      action: 'conversation_create',
      resource: 'conversation',
      resourceId: conversation.id,
      metadata: { title: conversation.title, modelId: conversation.modelId },
      ...getClientInfo(request),
    });

    logger.info('chat', 'Conversation created', {
      userId,
      metadata: { conversationId: conversation.id },
    });

    return NextResponse.json({ conversation }, { status: 201 });
  } catch (error) {
    logger.error('api', 'Error creating conversation', error instanceof Error ? error : undefined, {
      requestId,
      userId,
    });

    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    );
  }
}
