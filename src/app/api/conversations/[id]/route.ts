import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { conversations, messages } from '@/lib/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { logAudit, getClientInfo } from '@/lib/audit';
import { logger, generateRequestId } from '@/lib/monitoring';

// GET /api/conversations/[id] - Get conversation with messages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;
  const { id } = await params;

  logger.apiRequest(requestId, 'GET', `/api/conversations/${id}`, userId);

  try {
    // Get conversation
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.id, id),
          eq(conversations.userId, userId)
        )
      )
      .limit(1);

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Get messages
    const conversationMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(asc(messages.createdAt));

    return NextResponse.json({
      conversation,
      messages: conversationMessages,
    });
  } catch (error) {
    logger.error('api', 'Error fetching conversation', error instanceof Error ? error : undefined, {
      requestId,
      userId,
      metadata: { conversationId: id },
    });

    return NextResponse.json(
      { error: 'Failed to fetch conversation' },
      { status: 500 }
    );
  }
}

// DELETE /api/conversations/[id] - Delete conversation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;
  const { id } = await params;

  logger.apiRequest(requestId, 'DELETE', `/api/conversations/${id}`, userId);

  try {
    // Verify ownership and delete
    const [deleted] = await db
      .delete(conversations)
      .where(
        and(
          eq(conversations.id, id),
          eq(conversations.userId, userId)
        )
      )
      .returning();

    if (!deleted) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    await logAudit({
      userId,
      action: 'conversation_delete',
      resource: 'conversation',
      resourceId: id,
      metadata: { title: deleted.title },
      ...getClientInfo(request),
    });

    logger.info('chat', 'Conversation deleted', {
      userId,
      metadata: { conversationId: id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('api', 'Error deleting conversation', error instanceof Error ? error : undefined, {
      requestId,
      userId,
      metadata: { conversationId: id },
    });

    return NextResponse.json(
      { error: 'Failed to delete conversation' },
      { status: 500 }
    );
  }
}

// PATCH /api/conversations/[id] - Update conversation (e.g., title)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;
  const { id } = await params;

  logger.apiRequest(requestId, 'PATCH', `/api/conversations/${id}`, userId);

  try {
    const { title, modelId } = await request.json();

    const [updated] = await db
      .update(conversations)
      .set({
        ...(title && { title }),
        ...(modelId && { modelId }),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(conversations.id, id),
          eq(conversations.userId, userId)
        )
      )
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    await logAudit({
      userId,
      action: 'model_switch',
      resource: 'conversation',
      resourceId: id,
      metadata: { title, modelId },
      ...getClientInfo(request),
    });

    return NextResponse.json({ conversation: updated });
  } catch (error) {
    logger.error('api', 'Error updating conversation', error instanceof Error ? error : undefined, {
      requestId,
      userId,
      metadata: { conversationId: id },
    });

    return NextResponse.json(
      { error: 'Failed to update conversation' },
      { status: 500 }
    );
  }
}
