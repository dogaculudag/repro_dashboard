import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { stopWork } from '@/lib/services/work-session.service';

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Giriş yapmanız gerekiyor' } },
        { status: 401 }
      );
    }
    const data = await stopWork(session.user.id);
    return NextResponse.json({ success: true, data });
  } catch (e) {
    console.error('POST /api/work-sessions/stop error:', e);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: (e as Error).message } },
      { status: 500 }
    );
  }
}
