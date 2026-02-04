import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { listFiles } from '@/lib/services/file.service';
import { hasPermission } from '@/lib/rbac';

/**
 * GET /api/assignments/pool
 * Returns files awaiting assignment (status AWAITING_ASSIGNMENT).
 * Requires file:assign permission.
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

    if (!hasPermission(session.user.role, 'file:assign')) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Atama havuzuna erişim yetkiniz yok' } },
        { status: 403 }
      );
    }

    const result = await listFiles({
      status: 'AWAITING_ASSIGNMENT',
      page: 1,
      limit: 500,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    return NextResponse.json({
      success: true,
      data: result.files,
      meta: { pagination: result.pagination },
    });
  } catch (error: any) {
    console.error('GET /api/assignments/pool error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
