import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAllActiveSessions } from '@/lib/services/work-session.service';
import { hasRole } from '@/lib/rbac';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Giriş yapmanız gerekiyor' } },
        { status: 401 }
      );
    }
    if (!hasRole(session.user, ['ADMIN'])) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Yetkiniz yok' } },
        { status: 403 }
      );
    }
    const data = await getAllActiveSessions();
    return NextResponse.json({ success: true, data });
  } catch (e) {
    console.error('GET /api/work-sessions/active-all error:', e);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: (e as Error).message } },
      { status: 500 }
    );
  }
}
