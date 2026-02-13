import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { FileStatus } from '@prisma/client';

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

    // Get all active designers with their current workload
    const designers = await prisma.user.findMany({
      where: {
        role: 'GRAFIKER',
        isActive: true,
      },
      select: {
        id: true,
        fullName: true,
        username: true,
        _count: {
          select: {
            assignedFiles: {
              where: {
                status: { notIn: [FileStatus.SENT_TO_PRODUCTION] },
              },
            },
          },
        },
      },
      orderBy: { fullName: 'asc' },
    });

    const result = designers.map((d) => ({
      id: d.id,
      fullName: d.fullName,
      username: d.username,
      activeFilesCount: d._count.assignedFiles,
    }));

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('GET /api/users/designers error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
