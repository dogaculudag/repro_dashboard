import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDepartmentTotalTime } from '@/lib/services/work-session.service';
import { hasRole } from '@/lib/rbac';
import { workSessionReportQuerySchema } from '@/lib/validations';

export async function GET(request: NextRequest) {
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
    const { searchParams } = new URL(request.url);
    const raw = Object.fromEntries(searchParams.entries());
    const parsed = workSessionReportQuerySchema.safeParse(raw);
    const opts = parsed.success ? parsed.data : {};
    const departmentId = opts.departmentId ?? session.user.departmentId;
    const from = opts.from ? new Date(opts.from) : undefined;
    const to = opts.to ? new Date(opts.to) : undefined;
    const period = opts.period;
    const data = await getDepartmentTotalTime(departmentId, { period, from, to });
    return NextResponse.json({ success: true, data });
  } catch (e) {
    console.error('GET /api/work-sessions/reports/department error:', e);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: (e as Error).message } },
      { status: 500 }
    );
  }
}
