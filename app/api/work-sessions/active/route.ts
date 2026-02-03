import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getActiveSession } from '@/lib/services/work-session.service';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Giriş yapmanız gerekiyor' } },
        { status: 401 }
      );
    }
    const active = await getActiveSession(session.user.id);
    return NextResponse.json({ success: true, data: active });
  } catch (e) {
    console.error('GET /api/work-sessions/active error:', e);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: (e as Error).message } },
      { status: 500 }
    );
  }
}
