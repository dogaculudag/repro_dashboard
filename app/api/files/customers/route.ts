import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/files/customers?q=...
 * Returns distinct customer names (and optionally customerNo) for autocomplete.
 * q: optional search string (customerName contains, case-insensitive).
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Giriş yapmanız gerekiyor' } },
        { status: 401 }
      );
    }

    const q = request.nextUrl.searchParams.get('q')?.trim() || '';

    const files = await prisma.file.findMany({
      where: q
        ? { customerName: { contains: q, mode: 'insensitive' } }
        : undefined,
      select: { customerName: true, customerNo: true },
      distinct: ['customerName'],
      orderBy: { customerName: 'asc' },
      take: 50,
    });

    const customers = files.map((f) => ({
      customerName: f.customerName,
      customerNo: f.customerNo ?? undefined,
    }));

    return NextResponse.json({ success: true, data: customers });
  } catch (error: any) {
    console.error('GET /api/files/customers error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
