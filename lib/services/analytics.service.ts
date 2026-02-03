import { prisma } from '@/lib/db';
import { subDays } from 'date-fns';

export interface UserAnalyticsRow {
  userId: string;
  userName: string;
  fullName: string;
  totalTimeSeconds: number;
  totalFilesWorked: number;
  weightedScore: number;
  productivity: number;
  breakdownByFileType: Array<{
    fileTypeId: string;
    name: string;
    totalTimeSeconds: number;
    weightedScore: number;
  }>;
  breakdownByDepartment: Array<{
    departmentId: string;
    departmentName: string;
    departmentCode: string;
    totalTimeSeconds: number;
  }>;
}

/**
 * Admin: Tarih aralığına göre kullanıcı bazlı performans analitiği.
 * Veri kaynağı: TimeEntry (join File, FileType, Department).
 */
export async function getUsersAnalytics(options: {
  from?: Date;
  to?: Date;
}): Promise<UserAnalyticsRow[]> {
  const to = options.to ?? new Date();
  const from = options.from ?? subDays(to, 30);

  const entries = await prisma.timeEntry.findMany({
    where: {
      startAt: { gte: from, lte: to },
      endAt: { not: null },
      durationSeconds: { not: null },
    },
    include: {
      user: { select: { id: true, fullName: true, username: true } },
      file: {
        select: {
          id: true,
          difficultyWeight: true,
          fileTypeId: true,
          fileType: { select: { id: true, name: true } },
        },
      },
      department: { select: { id: true, name: true, code: true } },
    },
  });

  const byUser: Record<
    string,
    {
      userId: string;
      userName: string;
      fullName: string;
      totalTimeSeconds: number;
      fileIds: Set<string>;
      weightedSum: number;
      byFileType: Record<string, { name: string; totalSeconds: number; weightedScore: number }>;
      byDepartment: Record<string, { name: string; code: string; totalSeconds: number }>;
    }
  > = {};

  for (const e of entries) {
    const sec = e.durationSeconds ?? 0;
    const weight = e.file.difficultyWeight ?? 1;
    const hours = sec / 3600;
    const weighted = hours * weight;

    if (!byUser[e.userId]) {
      byUser[e.userId] = {
        userId: e.user.id,
        userName: e.user.username,
        fullName: e.user.fullName,
        totalTimeSeconds: 0,
        fileIds: new Set(),
        weightedSum: 0,
        byFileType: {},
        byDepartment: {},
      };
    }
    const u = byUser[e.userId];
    u.totalTimeSeconds += sec;
    u.fileIds.add(e.fileId);
    u.weightedSum += weighted;

    if (e.file.fileType) {
      const ft = e.file.fileType;
      if (!u.byFileType[ft.id]) {
        u.byFileType[ft.id] = { name: ft.name, totalSeconds: 0, weightedScore: 0 };
      }
      u.byFileType[ft.id].totalSeconds += sec;
      u.byFileType[ft.id].weightedScore += weighted;
    }

    const dept = e.department;
    if (!u.byDepartment[dept.id]) {
      u.byDepartment[dept.id] = { name: dept.name, code: dept.code, totalSeconds: 0 };
    }
    u.byDepartment[dept.id].totalSeconds += sec;
  }

  return Object.values(byUser).map((u) => {
    const totalHours = u.totalTimeSeconds / 3600;
    const productivity = totalHours > 0 ? u.weightedSum / totalHours : 0;
    return {
      userId: u.userId,
      userName: u.userName,
      fullName: u.fullName,
      totalTimeSeconds: u.totalTimeSeconds,
      totalFilesWorked: u.fileIds.size,
      weightedScore: Math.round(u.weightedSum * 100) / 100,
      productivity: Math.round(productivity * 100) / 100,
      breakdownByFileType: Object.entries(u.byFileType).map(([fileTypeId, v]) => ({
        fileTypeId,
        name: v.name,
        totalTimeSeconds: v.totalSeconds,
        weightedScore: Math.round(v.weightedScore * 100) / 100,
      })),
      breakdownByDepartment: Object.entries(u.byDepartment).map(([departmentId, v]) => ({
        departmentId,
        departmentName: v.name,
        departmentCode: v.code,
        totalTimeSeconds: v.totalSeconds,
      })),
    };
  });
}
