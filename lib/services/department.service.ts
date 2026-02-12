import { prisma } from '@/lib/db';
import { FileStatus } from '@prisma/client';

export interface DepartmentFileCount {
  departmentId: string;
  departmentName: string;
  departmentCode: string;
  total: number;
  breakdown: {
    acik: number;
    devam: number;
    bitti: number;
  };
}

/**
 * Get file counts per department.
 * Used by both the API route and Server Components (e.g. admin settings).
 */
export async function getDepartmentFileCounts(): Promise<DepartmentFileCount[]> {
  const departments = await prisma.department.findMany({
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true,
      name: true,
      code: true,
    },
  });

  const fileCounts = await prisma.file.groupBy({
    by: ['currentDepartmentId', 'status'],
    _count: { id: true },
  });

  const totalCounts = await prisma.file.groupBy({
    by: ['currentDepartmentId'],
    _count: { id: true },
  });

  const countsByDept = new Map<string, { total: number; acik: number; devam: number; bitti: number }>();

  departments.forEach((dept) => {
    countsByDept.set(dept.id, { total: 0, acik: 0, devam: 0, bitti: 0 });
  });

  totalCounts.forEach((item) => {
    const existing = countsByDept.get(item.currentDepartmentId);
    if (existing) {
      existing.total = item._count.id;
    }
  });

  fileCounts.forEach((item) => {
    const existing = countsByDept.get(item.currentDepartmentId);
    if (existing) {
      const count = item._count.id;
      if (item.status === FileStatus.SENT_TO_PRODUCTION) {
        existing.bitti = count;
      } else if (
        item.status === FileStatus.IN_REPRO ||
        item.status === FileStatus.IN_QUALITY ||
        item.status === FileStatus.IN_KOLAJ ||
        item.status === FileStatus.APPROVAL_PREP ||
        item.status === FileStatus.CUSTOMER_APPROVAL
      ) {
        existing.devam = (existing.devam || 0) + count;
      } else {
        existing.acik = (existing.acik || 0) + count;
      }
    }
  });

  return departments.map((dept) => {
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
}
