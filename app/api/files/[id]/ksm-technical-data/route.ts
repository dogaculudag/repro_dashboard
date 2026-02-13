import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { updateKsmTechnicalDataNormalized } from '@/lib/services/file.service';
import { ksmTechnicalDataUpdateSchema } from '@/lib/validations';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Giriş yapmanız gerekiyor' } },
        { status: 401 }
      );
    }
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Yetkiniz yok' } },
        { status: 403 }
      );
    }
    const { id } = await params;
    const body = await request.json();
    const input = ksmTechnicalDataUpdateSchema.parse(body);
    const data = await updateKsmTechnicalDataNormalized(id, input);
    return NextResponse.json({ success: true, data });
  } catch (e: unknown) {
    console.error('PATCH /api/files/[id]/ksm-technical-data error:', e);
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Geçersiz veri', details: e.flatten() } },
        { status: 422 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: (e as Error).message } },
      { status: 500 }
    );
  }
}
