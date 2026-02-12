import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { assignFile } from '@/lib/services/file.service';
import { hasPermission } from '@/lib/rbac';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const singleAssignSchema = z.object({
  fileId: z.string().uuid('Geçersiz dosya ID'),
  assigneeId: z.string().uuid('Geçersiz atanacak kullanıcı ID'),
});

/**
 * POST /api/assignments/single
 * Body: { fileId: string, assigneeId: string }
 * Assigns one file to assigneeId.
 */
export async function POST(request: NextRequest) {
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
        { success: false, error: { code: 'FORBIDDEN', message: 'Atama yetkiniz yok' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { fileId, assigneeId } = singleAssignSchema.parse(body);

    const file = await assignFile(fileId, assigneeId, session.user.id);

    return NextResponse.json({ success: true, data: file });
  } catch (error: any) {
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
