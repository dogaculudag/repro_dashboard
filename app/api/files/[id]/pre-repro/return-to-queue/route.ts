import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { returnPreReproToQueue } from '@/lib/services/file.service';

export async function POST(
  _request: NextRequest,
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

    const { role } = session.user;
    if (role !== 'ONREPRO' && role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Geri kuyruğa atma yetkiniz yok' } },
        { status: 403 }
      );
    }

    const fileId = params.id;
    const file = await returnPreReproToQueue(fileId, session.user.id);

    return NextResponse.json({ success: true, data: file });
  } catch (error: unknown) {
    console.error('POST /api/files/[id]/pre-repro/return-to-queue error:', error);

    if (error instanceof Error) {
      if (error.message === 'Dosya bulunamadı') {
        return NextResponse.json(
          { success: false, error: { code: 'NOT_FOUND', message: error.message } },
          { status: 404 }
        );
      }
      if (error.message === 'Sadece dosyayı devralmış kişi geri kuyruğa atabilir') {
        return NextResponse.json(
          { success: false, error: { code: 'FORBIDDEN', message: error.message } },
          { status: 403 }
        );
      }
      if (error.message === 'Dosya Ön Repro aşamasında değil') {
        return NextResponse.json(
          { success: false, error: { code: 'VALIDATION_ERROR', message: error.message } },
          { status: 422 }
        );
      }
    }

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
