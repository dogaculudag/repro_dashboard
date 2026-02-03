import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { stopTimeEntry } from '@/lib/services/time-entry.service';
import { timeStopSchema } from '@/lib/validations';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Giriş yapmanız gerekiyor' } },
        { status: 401 }
      );
    }
    const body = await request.json().catch(() => ({}));
    const { fileId } = timeStopSchema.parse(body);
    const data = await stopTimeEntry(session.user.id, fileId);
    return NextResponse.json({ success: true, data });
  } catch (e: unknown) {
    console.error('POST /api/time/stop error:', e);
    if (e && typeof e === 'object' && 'name' in e && (e as { name: string }).name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Geçersiz veri', details: (e as { flatten: () => unknown }).flatten?.() } },
        { status: 422 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: (e as Error).message } },
      { status: 500 }
    );
  }
}
