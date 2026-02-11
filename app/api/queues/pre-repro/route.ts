import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPreReproQueue } from '@/lib/services/file.service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
