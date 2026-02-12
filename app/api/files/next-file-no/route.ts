import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getNextFileNo } from '@/lib/services/file.service';
import { hasPermission } from '@/lib/rbac';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/files/next-file-no
 * Returns the next auto-generated file number (e.g. REP-2026-0001).
 * Requires file:create permission.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Giriş yapmanız gerekiyor' } },
        { status: 401 }
      );
    }

    if (!hasPermission(session.user.role, 'file:create')) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Bu işlem için yetkiniz yok' } },
        { status: 403 }
      );
    }

    const nextFileNo = await getNextFileNo();
    return NextResponse.json({ success: true, data: { fileNo: nextFileNo } });
  } catch (error: any) {
    console.error('GET /api/files/next-file-no error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
