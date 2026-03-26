import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getFileById } from '@/lib/db/queries';

export const runtime = 'nodejs';

export async function GET(
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

  return NextResponse.json({
    id: file.id,
    status: file.status,
    errorMessage: file.errorMessage,
  });
}
