import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getMyTimeSummary } from '@/lib/services/time-entry.service';
import { getDateRange } from '@/lib/services/work-session.service';
import { mySummaryQuerySchema } from '@/lib/validations';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Giriş yapmanız gerekiyor' } },
        { status: 401 }
      );
    }
    const { searchParams } = new URL(request.url);
    const raw = Object.fromEntries(searchParams);
    const parsed = mySummaryQuerySchema.safeParse(raw);
    let from: Date;
    let to: Date;
    if (parsed.success && (parsed.data.from || parsed.data.to || parsed.data.period)) {
      if (parsed.data.from && parsed.data.to) {
        from = new Date(parsed.data.from);
        to = new Date(parsed.data.to);
      } else {
        const range = getDateRange(parsed.data.period ?? 'week');
        from = range.from;
        to = range.to;
      }
    } else {
      const range = getDateRange('week');
      from = range.from;
      to = range.to;
    }
    const data = await getMyTimeSummary(session.user.id, { from, to });
    return NextResponse.json({ success: true, data });
  } catch (e: unknown) {
    console.error('GET /api/time/my-summary error:', e);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: (e as Error).message } },
      { status: 500 }
    );
  }
}
