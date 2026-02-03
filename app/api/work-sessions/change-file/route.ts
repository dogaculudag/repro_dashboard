import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { changeFile } from '@/lib/services/work-session.service';
import { changeFileSchema } from '@/lib/validations';

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
    const { fileId } = changeFileSchema.parse(body);
    const data = await changeFile(session.user.id, fileId);
    return NextResponse.json({ success: true, data });
  } catch (e: unknown) {
    console.error('POST /api/work-sessions/change-file error:', e);
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
