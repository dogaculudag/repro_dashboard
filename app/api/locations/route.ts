import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Giriş yapmanız gerekiyor' } },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const area = searchParams.get('area');

    const locations = await prisma.locationSlot.findMany({
      where: {
        isActive: true,
        ...(area && { area: area as any }),
      },
      include: {
        files: {
          where: {
            status: { not: 'SENT_TO_PRODUCTION' },
          },
          select: {
            id: true,
            fileNo: true,
          },
        },
      },
      orderBy: [{ area: 'asc' }, { row: 'asc' }, { column: 'asc' }],
    });

    // Transform to include currentFile info
    const result = locations.map((loc) => ({
      id: loc.id,
      code: loc.code,
      name: loc.name,
      area: loc.area,
      row: loc.row,
      column: loc.column,
      isActive: loc.isActive,
      currentFile: loc.files[0] ?? null,
    }));

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('GET /api/locations error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
