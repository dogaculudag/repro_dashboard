import { prisma } from '@/lib/db';

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

function computeDurationSeconds(startAt: Date, endAt: Date): number {
  return Math.floor((endAt.getTime() - new Date(startAt).getTime()) / 1000);
}

/**
 * User'ın aktif (endAt=null) TimeEntry kaydı varsa döner; yoksa null.
 */
export async function getActiveTimeEntry(userId: string) {
  const entry = await prisma.timeEntry.findFirst({
    where: { userId, endAt: null },
    include: {
      file: { select: { id: true, fileNo: true, customerName: true } },
      department: { select: { id: true, name: true, code: true } },
    },
  });
  if (!entry) return null;
  const now = new Date();
  return {
    ...entry,
    durationSeconds: computeDurationSeconds(entry.startAt, now),
    isActive: true,
  };
}

/**
 * Kullanıcı bir dosyada süre başlatır. Aynı anda tek aktif TimeEntry olabilir.
 */
export async function startTimeEntry(userId: string, fileId: string, note?: string) {
  return prisma.$transaction(async (tx: Tx) => {
    const existing = await tx.timeEntry.findFirst({
      where: { userId, endAt: null },
    });
    if (existing) {
      throw new Error('Zaten aktif bir süre kaydınız var. Önce onu durdurun.');
    }
    const file = await tx.file.findUnique({
      where: { id: fileId },
      include: { currentDepartment: true },
    });
    if (!file) throw new Error('Dosya bulunamadı');
    return tx.timeEntry.create({
      data: {
        userId,
        fileId,
        departmentId: file.currentDepartmentId,
        startAt: new Date(),
        note: note ?? undefined,
      },
      include: {
        file: { select: { id: true, fileNo: true, customerName: true } },
        department: { select: { id: true, name: true, code: true } },
      },
    });
  }, { isolationLevel: 'Serializable' });
}

/**
 * Kullanıcının aktif TimeEntry'sini durdurur. fileId verilirse sadece o dosyadaki aktif kayıt kapatılır.
 */
export async function stopTimeEntry(userId: string, fileId?: string) {
  return prisma.$transaction(async (tx: Tx) => {
    const where: { userId: string; endAt: null; fileId?: string } = { userId, endAt: null };
    if (fileId) where.fileId = fileId;
    const active = await tx.timeEntry.findFirst({ where });
    if (!active) throw new Error('Aktif süre kaydı bulunamadı');
    const endAt = new Date();
    const durationSeconds = computeDurationSeconds(active.startAt, endAt);
    return tx.timeEntry.update({
      where: { id: active.id },
      data: { endAt, durationSeconds },
      include: {
        file: { select: { id: true, fileNo: true, customerName: true } },
        department: { select: { id: true, name: true, code: true } },
      },
    });
  }, { isolationLevel: 'Serializable' });
}

/**
 * Kullanıcının kendi süre özeti (from–to), fileType kırılımı ile.
 */
export async function getMyTimeSummary(
  userId: string,
  options: { from: Date; to: Date }
) {
  const entries = await prisma.timeEntry.findMany({
    where: {
      userId,
      startAt: { gte: options.from, lte: options.to },
      endAt: { not: null },
      durationSeconds: { not: null },
    },
    include: {
      file: {
        select: {
          id: true,
          fileNo: true,
          customerName: true,
          fileTypeId: true,
          fileType: { select: { id: true, name: true } },
          difficultyWeight: true,
        },
      },
      department: { select: { id: true, name: true, code: true } },
    },
    orderBy: { startAt: 'desc' },
  });

  let totalSeconds = 0;
  const byFileType: Record<
    string,
    { fileTypeId: string; fileTypeName: string; totalSeconds: number; weightedScore: number }
  > = {};
  const byDepartment: Record<string, { departmentId: string; name: string; code: string; totalSeconds: number }> = {};

  for (const e of entries) {
    const sec = e.durationSeconds ?? 0;
    totalSeconds += sec;
    const weight = e.file.difficultyWeight ?? 1;
    const hours = sec / 3600;
    const weighted = hours * weight;

    if (e.file.fileType) {
      const ft = e.file.fileType;
      if (!byFileType[ft.id]) {
        byFileType[ft.id] = { fileTypeId: ft.id, fileTypeName: ft.name, totalSeconds: 0, weightedScore: 0 };
      }
      byFileType[ft.id].totalSeconds += sec;
      byFileType[ft.id].weightedScore += weighted;
    }

    const dept = e.department;
    if (!byDepartment[dept.id]) {
      byDepartment[dept.id] = { departmentId: dept.id, name: dept.name, code: dept.code, totalSeconds: 0 };
    }
    byDepartment[dept.id].totalSeconds += sec;
  }

  const totalHours = totalSeconds / 3600;
  const totalWeighted = entries.reduce(
    (sum, e) => sum + ((e.durationSeconds ?? 0) / 3600) * (e.file.difficultyWeight ?? 1),
    0
  );
  const productivity = totalHours > 0 ? totalWeighted / totalHours : 0;

  return {
    from: options.from,
    to: options.to,
    totalSeconds,
    totalHours: Math.round(totalHours * 100) / 100,
    weightedScore: Math.round(totalWeighted * 100) / 100,
    productivity: Math.round(productivity * 100) / 100,
    breakdownByFileType: Object.values(byFileType),
    breakdownByDepartment: Object.values(byDepartment),
    entries: entries.map((e) => ({
      id: e.id,
      fileId: e.file.id,
      fileNo: e.file.fileNo,
      customerName: e.file.customerName,
      startAt: e.startAt,
      endAt: e.endAt,
      durationSeconds: e.durationSeconds,
      fileTypeName: e.file.fileType?.name ?? null,
    })),
  };
}
