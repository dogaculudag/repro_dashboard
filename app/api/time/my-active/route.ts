import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getActiveTimeEntry } from '@/lib/services/time-entry.service';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Giriş yapmanız gerekiyor' } },
        { status: 401 }
      );
    }
    const data = await getActiveTimeEntry(session.user.id);
    return NextResponse.json({ success: true, data });
  } catch (e: unknown) {
    console.error('GET /api/time/my-active error:', e);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: (e as Error).message } },
      { status: 500 }
    );
  }
}
