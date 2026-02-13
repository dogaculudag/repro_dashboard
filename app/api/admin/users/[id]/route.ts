import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  if (!id) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'Geçersiz kullanıcı ID' } },
      { status: 400 }
    );
  }

  // Kendi hesabını silmeyi engelle
  if (id === session.user.id) {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'Kendi hesabınızı silemezsiniz' } },
      { status: 400 }
    );
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Kullanıcı bulunamadı' } },
        { status: 404 }
      );
    }

    // Soft delete: isActive=false
    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('DELETE /api/admin/users/[id] error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: (error as Error).message } },
      { status: 500 }
    );
  }
}
