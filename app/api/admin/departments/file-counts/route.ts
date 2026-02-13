import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDepartmentFileCounts } from '@/lib/services/department.service';

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
    
    // Allow ADMIN role only (Bahar has ADMIN role)
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Yetkiniz yok' } },
        { status: 403 }
      );
    }

    const result = await getDepartmentFileCounts();
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('GET /api/admin/departments/file-counts error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
