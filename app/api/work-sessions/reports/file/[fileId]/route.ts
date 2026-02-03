import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getFileWorkerBreakdown } from '@/lib/services/work-session.service';

export async function GET(
  _request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Giriş yapmanız gerekiyor' } },
        { status: 401 }
      );
    }
    const data = await getFileWorkerBreakdown(params.fileId);
    return NextResponse.json({ success: true, data });
  } catch (e) {
    console.error('GET /api/work-sessions/reports/file/[fileId] error:', e);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: (e as Error).message } },
      { status: 500 }
    );
  }
}
