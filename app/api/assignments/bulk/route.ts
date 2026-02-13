import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { assignFile } from '@/lib/services/file.service';
import { hasPermission } from '@/lib/rbac';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const bulkAssignSchema = z.object({
  fileIds: z.array(z.string().uuid()).min(1, 'En az bir dosya seçin').max(100, 'En fazla 100 dosya atanabilir'),
  assigneeId: z.string().uuid('Geçersiz atanacak kullanıcı ID'),
  note: z.string().max(1000).optional(),
});

/**
 * POST /api/assignments/bulk
 * Body: { fileIds: string[], assigneeId: string, note?: string }
 * Assigns all given files to assigneeId. Returns successCount, failCount, results, skippedIds.
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
        { success: false, error: { code: 'FORBIDDEN', message: 'Toplu atama yetkiniz yok' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { fileIds, assigneeId, note } = bulkAssignSchema.parse(body);

    const results: { fileId: string; success: boolean; error?: string }[] = [];
    const skippedIds: string[] = [];

    for (const fileId of fileIds) {
      try {
        await assignFile(fileId, assigneeId, session.user.id, note);
        results.push({ fileId, success: true });
      } catch (err: any) {
        results.push({ fileId, success: false, error: err.message });
        skippedIds.push(fileId);
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      data: {
        total: fileIds.length,
        successCount,
        failCount,
        results,
        skippedIds,
      },
    });
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
