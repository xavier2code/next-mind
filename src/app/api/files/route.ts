import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getFilesByUserPaginated } from '@/lib/db/queries';

export const runtime = 'nodejs';

const VALID_SORT_BY = ['filename', 'size', 'createdAt', 'fileType'] as const;
const VALID_SORT_ORDER = ['asc', 'desc'] as const;
const VALID_FILE_TYPE = ['all', 'document', 'code', 'data'] as const;

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;

  // Parse and validate sortBy
  const sortByParam = searchParams.get('sortBy');
  const sortBy = VALID_SORT_BY.includes(sortByParam as typeof VALID_SORT_BY[number])
    ? (sortByParam as typeof VALID_SORT_BY[number])
    : 'createdAt';

  // Parse and validate sortOrder
  const sortOrderParam = searchParams.get('sortOrder');
  const sortOrder = VALID_SORT_ORDER.includes(sortOrderParam as typeof VALID_SORT_ORDER[number])
    ? (sortOrderParam as 'asc' | 'desc')
    : 'desc';

  // Parse and validate fileType
  const fileTypeParam = searchParams.get('fileType');
  const fileType = VALID_FILE_TYPE.includes(fileTypeParam as typeof VALID_FILE_TYPE[number])
    ? (fileTypeParam as 'all' | 'document' | 'code' | 'data')
    : 'all';

  // Parse page and pageSize
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10) || 20));

  const result = await getFilesByUserPaginated(session.user.id, {
    page,
    pageSize,
    sortBy,
    sortOrder,
    fileType,
  });

  return NextResponse.json(result);
}
