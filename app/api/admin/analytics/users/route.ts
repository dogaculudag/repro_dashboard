import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUsersAnalytics } from '@/lib/services/analytics.service';
import { analyticsUsersQuerySchema } from '@/lib/validations';
import { subDays } from 'date-fns';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
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
    const { searchParams } = new URL(request.url);
    const raw = Object.fromEntries(searchParams);
    const parsed = analyticsUsersQuerySchema.safeParse(raw);
    const to = parsed.success && parsed.data.to ? new Date(parsed.data.to) : new Date();
    const from = parsed.success && parsed.data.from ? new Date(parsed.data.from) : subDays(to, 30);
    const data = await getUsersAnalytics({ from, to });
    return NextResponse.json({ success: true, data, meta: { from, to } });
  } catch (e: unknown) {
    console.error('GET /api/admin/analytics/users error:', e);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: (e as Error).message } },
      { status: 500 }
    );
  }
}
