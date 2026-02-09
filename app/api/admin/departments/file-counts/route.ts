import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { FileStatus } from '@prisma/client';

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

    // Get all departments
    const departments = await prisma.department.findMany({
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        code: true,
      },
    });

    // Get file counts grouped by department using a single query
    // Using groupBy for efficient aggregation
    const fileCounts = await prisma.file.groupBy({
      by: ['currentDepartmentId', 'status'],
      _count: {
        id: true,
      },
    });

    // Get total counts per department (all statuses)
    const totalCounts = await prisma.file.groupBy({
      by: ['currentDepartmentId'],
      _count: {
        id: true,
      },
    });

    // Create a map for quick lookup
    const countsByDept = new Map<string, { total: number; acik: number; devam: number; bitti: number }>();
    
    // Initialize all departments with 0 counts
    departments.forEach((dept) => {
      countsByDept.set(dept.id, { total: 0, acik: 0, devam: 0, bitti: 0 });
    });

    // Fill in total counts
    totalCounts.forEach((item) => {
      const existing = countsByDept.get(item.currentDepartmentId);
      if (existing) {
        existing.total = item._count.id;
      }
    });

    // Fill in breakdown by status
    fileCounts.forEach((item) => {
      const existing = countsByDept.get(item.currentDepartmentId);
      if (existing) {
        const count = item._count.id;
        
        // "Bitti" = SENT_TO_PRODUCTION
        if (item.status === FileStatus.SENT_TO_PRODUCTION) {
          existing.bitti = count;
        }
        // "Devam" = actively being worked on
        else if (
          item.status === FileStatus.IN_REPRO ||
          item.status === FileStatus.IN_QUALITY ||
          item.status === FileStatus.IN_KOLAJ ||
          item.status === FileStatus.APPROVAL_PREP ||
          item.status === FileStatus.CUSTOMER_APPROVAL
        ) {
          existing.devam = (existing.devam || 0) + count;
        }
        // "Açık" = not sent to production (all other statuses)
        // This includes: AWAITING_ASSIGNMENT, ASSIGNED, REVISION_REQUIRED
        else {
          existing.acik = (existing.acik || 0) + count;
        }
      }
    });

    // Format response
    const result = departments.map((dept) => {
      const counts = countsByDept.get(dept.id) || { total: 0, acik: 0, devam: 0, bitti: 0 };
      return {
        departmentId: dept.id,
        departmentName: dept.name,
        departmentCode: dept.code,
        total: counts.total,
        breakdown: {
          acik: counts.acik,
          devam: counts.devam,
          bitti: counts.bitti,
        },
      };
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('GET /api/admin/departments/file-counts error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
