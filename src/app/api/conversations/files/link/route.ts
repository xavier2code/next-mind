import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { linkFileToConversation } from '@/lib/db/queries';
import { logAudit, getClientInfo } from '@/lib/audit';

// POST /api/conversations/files/link — Associate a file with a conversation and optional message (D-04)
export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { fileId, conversationId, messageId } = body;

    if (!fileId || !conversationId) {
      return NextResponse.json(
        { error: 'fileId and conversationId are required' },
        { status: 400 }
      );
    }

    const link = await linkFileToConversation(fileId, conversationId, messageId);

    logAudit({
      userId: session.user.id,
      action: 'link_file_to_conversation',
      resource: 'conversationFile',
      resourceId: link.id,
      details: { fileId, conversationId, messageId },
      clientInfo: getClientInfo(request),
    }).catch(() => {});

    return NextResponse.json({ link }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to link file to conversation' },
      { status: 500 }
    );
  }
}
