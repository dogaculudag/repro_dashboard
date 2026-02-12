import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { listFiles, createFile } from '@/lib/services/file.service';
import { createFileSchema, fileQuerySchema } from '@/lib/validations';
import { hasPermission } from '@/lib/rbac';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Giriş yapmanız gerekiyor' } },
        { status: 401 }
      );
    }

    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const query = fileQuerySchema.parse(searchParams);

    const result = await listFiles(query);

    return NextResponse.json({
      success: true,
      data: result.files,
      meta: { pagination: result.pagination },
    });
  } catch (error: any) {
    console.error('GET /api/files error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const validatedData = createFileSchema.parse(body);

    const file = await createFile(
      validatedData,
      session.user.id,
      session.user.departmentId
    );

    return NextResponse.json({ success: true, data: file }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/files error:', error);
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Bu dosya numarası zaten mevcut' } },
        { status: 422 }
      );
    }

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
