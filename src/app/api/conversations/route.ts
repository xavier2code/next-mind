import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { conversations } from '@/lib/db/schema';
import { eq, desc, and } from 'drizzle-orm';

// GET /api/conversations - List conversations with search
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
      .where(eq(conversations.userId, session.user.id))
      .orderBy(desc(conversations.updatedAt))
      .limit(limit)
      .offset(offset);

    // Filter by search if provided
    const filtered = search
      ? result.filter(c => c.title.toLowerCase().includes(search.toLowerCase()))
      : result;

    return NextResponse.json({ conversations: filtered });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}

// POST /api/conversations - Create new conversation
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { title, modelId } = await request.json();

    const [conversation] = await db
      .insert(conversations)
      .values({
        userId: session.user.id,
        title: title || 'New conversation',
        modelId: modelId || 'qwen3.5-turbo',
      })
      .returning();

    return NextResponse.json({ conversation }, { status: 201 });
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    );
  }
}
