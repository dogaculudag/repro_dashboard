import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { listFiles } from '@/lib/services/file.service';
import { hasPermission } from '@/lib/rbac';

/**
 * GET /api/assignments/pool
 * Returns files that are at the current user (Bahar atama havuzu).
 * Sadece Ön Repro'dan Bahar'a devredilmiş dosyalar: stage=REPRO, assignedDesignerId=currentUser.id.
 * PRE_REPRO (Ön Repro kuyruğundaki) dosyalar burada görünmez.
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

    // [DEBUG] File counts – remove after root-cause verification
    const totalFiles = await prisma.file.count();
    const byStage = await prisma.file.groupBy({ by: ['stage'], _count: true });
    console.log('[DEBUG /api/assignments/pool] File total:', totalFiles, 'byStage:', JSON.stringify(byStage));

    const result = await listFiles({
      stage: 'REPRO',
      assignedDesignerId: session.user.id,
      page: 1,
      limit: 500,
      sortBy: 'updatedAt',
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
