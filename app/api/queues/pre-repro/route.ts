import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getPreReproQueue } from '@/lib/services/file.service';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Giriş yapmanız gerekiyor' } },
        { status: 401 }
      );
    }

    const { role } = session.user;
    if (role !== 'ADMIN' && role !== 'ONREPRO') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Bu kuyruğu görüntüleme yetkiniz yok' } },
        { status: 403 }
      );
    }

    // [DEBUG] File counts – remove after root-cause verification
    const totalFiles = await prisma.file.count();
    const byStage = await prisma.file.groupBy({ by: ['stage'], _count: true });
    console.log('[DEBUG /api/queues/pre-repro] File total:', totalFiles, 'byStage:', JSON.stringify(byStage));

    const files = await getPreReproQueue();
    return NextResponse.json({ success: true, data: files });
  } catch (error: unknown) {
    console.error('GET /api/queues/pre-repro error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Beklenmeyen hata',
        },
      },
      { status: 500 }
    );
  }
}
