import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getFileAuditLogs } from '@/lib/services/audit.service';
import { getFileTimers } from '@/lib/services/timer.service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Giriş yapmanız gerekiyor' } },
        { status: 401 }
      );
    }

    const [logs, timers] = await Promise.all([
      getFileAuditLogs(params.id),
      getFileTimers(params.id),
    ]);

    return NextResponse.json({
      success: true,
      data: { logs, timers },
    });
  } catch (error: any) {
    console.error('GET /api/files/[id]/timeline error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
