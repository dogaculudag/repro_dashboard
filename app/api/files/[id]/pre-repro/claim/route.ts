import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { claimPreRepro } from '@/lib/services/file.service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

    const { role, username } = session.user;
    if (role !== 'ONREPRO' && role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Ön Repro devralma yetkiniz yok' } },
        { status: 403 }
      );
    }
    if (username === 'bahar') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Bu kullanıcı dosya devralamaz.' } },
        { status: 403 }
      );
    }

    const fileId = params.id;
    const file = await claimPreRepro(fileId, session.user.id);

    revalidatePath('/dashboard/queues/pre-repro');
    revalidatePath('/dashboard/queue');
    return NextResponse.json({ success: true, data: file });
  } catch (error: unknown) {
    console.error('POST /api/files/[id]/pre-repro/claim error:', error);

    if (error instanceof Error) {
      if (error.message === 'Dosya bulunamadı') {
        return NextResponse.json(
          { success: false, error: { code: 'NOT_FOUND', message: error.message } },
          { status: 404 }
        );
      }
      if (error.message === 'Dosya zaten başka biri tarafından devralınmış') {
        return NextResponse.json(
          { success: false, error: { code: 'CONFLICT', message: error.message } },
          { status: 409 }
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
