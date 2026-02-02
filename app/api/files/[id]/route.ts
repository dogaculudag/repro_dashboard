import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getFileById, updateFile } from '@/lib/services/file.service';
import { updateFileSchema } from '@/lib/validations';

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

    const file = await getFileById(params.id);

    if (!file) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Dosya bulunamadı' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: file });
  } catch (error: any) {
    console.error('GET /api/files/[id] error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}

export async function PATCH(
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

    const body = await request.json();
    const validatedData = updateFileSchema.parse(body);

    const file = await updateFile(params.id, validatedData, session.user.id);

    return NextResponse.json({ success: true, data: file });
  } catch (error: any) {
    console.error('PATCH /api/files/[id] error:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Geçersiz veri', details: error.flatten().fieldErrors } },
        { status: 422 }
      );
    }

    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
