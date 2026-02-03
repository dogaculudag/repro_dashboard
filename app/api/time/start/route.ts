import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { startTimeEntry } from '@/lib/services/time-entry.service';
import { timeStartSchema } from '@/lib/validations';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Giriş yapmanız gerekiyor' } },
        { status: 401 }
      );
    }
    const body = await request.json();
    const { fileId, note } = timeStartSchema.parse(body);
    const data = await startTimeEntry(session.user.id, fileId, note);
    return NextResponse.json({ success: true, data });
  } catch (e: unknown) {
    console.error('POST /api/time/start error:', e);
    if (e && typeof e === 'object' && 'name' in e && (e as { name: string }).name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Geçersiz veri', details: (e as { flatten: () => unknown }).flatten?.() } },
        { status: 422 }
      );
    }
    const message = (e as Error).message;
    if (message.includes('Zaten aktif')) {
      return NextResponse.json(
        { success: false, error: { code: 'CONFLICT', message } },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message } },
      { status: 500 }
    );
  }
}
