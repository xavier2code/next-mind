import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getFileById, deleteFile as deleteDbFile } from '@/lib/db/queries';
import { deleteFile as deleteStorageFile } from '@/lib/storage/provider';
import { logAudit } from '@/lib/audit';

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

  return NextResponse.json(file);
}

export async function DELETE(
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

  // Delete storage file (fire-and-forget on failure)
  await deleteStorageFile(file.storagePath).catch(() => {});

  // Delete DB record
  const deleted = await deleteDbFile(id, session.user.id);
  if (!deleted) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  // Audit log (fire-and-forget per CLAUDE.md)
  logAudit({
    userId: session.user.id,
    action: 'file_delete',
    resource: 'file',
    resourceId: id,
    metadata: { filename: file.filename },
  }).catch(() => {});

  return NextResponse.json({ success: true });
}
