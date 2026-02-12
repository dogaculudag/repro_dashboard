import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ingestFromKsmView } from '@/lib/services/ksm-view-ingest.service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Giriş yapmanız gerekiyor' } },
        { status: 401 }
      );
    }
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Yetkiniz yok' } },
        { status: 403 }
      );
    }
    const result = await ingestFromKsmView(session.user.id);
    return NextResponse.json({ success: true, data: result });
  } catch (e: unknown) {
    console.error('POST /api/admin/ksm-ingest error:', e);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: (e as Error).message } },
      { status: 500 }
    );
  }
}
