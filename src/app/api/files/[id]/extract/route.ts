import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getFileById } from '@/lib/db/queries';
import { extractFile } from '@/lib/extraction/dispatcher';

export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const file = await getFileById(id);
  if (!file || file.userId !== session.user.id) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  if (file.status !== 'failed') {
    return NextResponse.json({ error: 'Only failed files can be retried' }, { status: 409 });
  }

  // Fire-and-forget extraction
  extractFile(file.id).catch(() => {});

  return NextResponse.json({ id: file.id, status: 'processing' });
}
