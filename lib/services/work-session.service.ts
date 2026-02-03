import { prisma } from '@/lib/db';
import { subDays, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/** Hesaplanmış süre: endTime varsa durationMinutes kullan veya hesapla; yoksa şu anki süre. */
function computeDurationMinutes(startTime: Date, endTime: Date | null): number {
  const end = endTime ?? new Date();
  return Math.floor((end.getTime() - new Date(startTime).getTime()) / 60_000);
}

/**
 * Kullanıcının aktif work session'ını kapatır (varsa).
 * Transaction içinde kullanılır.
 */
async function closeActiveSessionForUser(tx: Tx, userId: string) {
  const active = await tx.workSession.findFirst({
    where: { userId, endTime: null },
  });
  if (!active) return null;
  const endTime = new Date();
  const durationMinutes = computeDurationMinutes(active.startTime, endTime);
  return tx.workSession.update({
    where: { id: active.id },
    data: { endTime, durationMinutes },
  });
}

/**
 * Çalışan bir dosyada çalışmaya başlar.
 * Aynı anda sadece 1 dosyada aktif olabilir: varsa önceki session kapatılır.
 */
export async function startWork(userId: string, fileId: string) {
  return prisma.$transaction(async (tx) => {
    const file = await tx.file.findUnique({
      where: { id: fileId },
      include: { currentDepartment: true },
    });
    if (!file) throw new Error('Dosya bulunamadı');
    await closeActiveSessionForUser(tx, userId);
    return tx.workSession.create({
      data: {
        userId,
        fileId,
        departmentId: file.currentDepartmentId,
        startTime: new Date(),
      },
      include: {
        file: { select: { id: true, fileNo: true, customerName: true } },
        department: { select: { id: true, name: true, code: true } },
        user: { select: { id: true, fullName: true, username: true } },
      },
    });
  }, { isolationLevel: 'Serializable' });
}

/**
 * Çalışanın aktif session'ını kapatır.
 */
export async function stopWork(userId: string) {
  return prisma.$transaction(async (tx) => {
    const closed = await closeActiveSessionForUser(tx, userId);
    if (!closed) throw new Error('Aktif çalışma oturumu bulunamadı');
    return closed;
  }, { isolationLevel: 'Serializable' });
}

/**
 * Çalışan başka bir dosyaya geçer: önceki session kapatılır, yeni dosyada session başlar.
 */
export async function changeFile(userId: string, newFileId: string) {
  return prisma.$transaction(async (tx) => {
    await closeActiveSessionForUser(tx, userId);
    const file = await tx.file.findUnique({
      where: { id: newFileId },
      include: { currentDepartment: true },
    });
    if (!file) throw new Error('Dosya bulunamadı');
    return tx.workSession.create({
      data: {
        userId,
        fileId: newFileId,
        departmentId: file.currentDepartmentId,
        startTime: new Date(),
      },
      include: {
        file: { select: { id: true, fileNo: true, customerName: true } },
        department: { select: { id: true, name: true, code: true } },
        user: { select: { id: true, fullName: true, username: true } },
      },
    });
  }, { isolationLevel: 'Serializable' });
}

/**
 * Kullanıcının şu anki aktif work session'ı (varsa).
 */
export async function getActiveSession(userId: string) {
  const session = await prisma.workSession.findFirst({
    where: { userId, endTime: null },
    include: {
      file: { select: { id: true, fileNo: true, customerName: true } },
      department: { select: { id: true, name: true, code: true } },
    },
  });
  if (!session) return null;
  return {
    ...session,
    isActive: true,
    durationMinutes: computeDurationMinutes(session.startTime, null),
  };
}

/**
 * Tüm aktif work session'lar (kim hangi dosyada çalışıyor).
 */
export async function getAllActiveSessions() {
  const sessions = await prisma.workSession.findMany({
    where: { endTime: null },
    include: {
      user: { select: { id: true, fullName: true, username: true } },
      file: { select: { id: true, fileNo: true, customerName: true } },
      department: { select: { id: true, name: true, code: true } },
    },
    orderBy: { startTime: 'desc' },
  });
  return sessions.map((s) => ({
    ...s,
    isActive: true,
    durationMinutes: computeDurationMinutes(s.startTime, null),
  }));
}

/** Tarih aralığı: bugün / bu hafta / bu ay için from–to döndür. */
export function getDateRange(period: 'today' | 'week' | 'month'): { from: Date; to: Date } {
  const now = new Date();
  switch (period) {
    case 'today':
      return { from: startOfDay(now), to: endOfDay(now) };
    case 'week':
      return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
    case 'month':
      return { from: startOfMonth(now), to: endOfMonth(now) };
    default:
      return { from: subDays(now, 30), to: now };
  }
}

/**
 * Bir çalışanın süre özeti: bugün / hafta / ay veya from–to aralığında hangi dosyalarda ne kadar çalıştığı.
 */
export async function getWorkerTimeSummary(
  userId: string,
  options: { period?: 'today' | 'week' | 'month'; from?: Date; to?: Date } = {}
) {
  const { from, to } =
    options.from && options.to
      ? { from: options.from, to: options.to }
      : getDateRange(options.period ?? 'month');

  const sessions = await prisma.workSession.findMany({
    where: {
      userId,
      startTime: { gte: from, lte: to },
    },
    include: {
      file: { select: { id: true, fileNo: true, customerName: true } },
      department: { select: { id: true, name: true, code: true } },
    },
    orderBy: { startTime: 'desc' },
  });

  let totalMinutes = 0;
  const byFile: Record<
    string,
    { fileId: string; fileNo: string; customerName: string; totalMinutes: number; sessions: number }
  > = {};

  for (const s of sessions) {
    const minutes = s.durationMinutes ?? computeDurationMinutes(s.startTime, s.endTime);
    totalMinutes += minutes;
    if (!byFile[s.fileId]) {
      byFile[s.fileId] = {
        fileId: s.file.id,
        fileNo: s.file.fileNo,
        customerName: s.file.customerName,
        totalMinutes: 0,
        sessions: 0,
      };
    }
    byFile[s.fileId].totalMinutes += minutes;
    byFile[s.fileId].sessions += 1;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, fullName: true, username: true },
  });

  return {
    user,
    from,
    to,
    totalMinutes,
    totalHours: Math.round((totalMinutes / 60) * 100) / 100,
    byFile: Object.values(byFile),
    sessions,
  };
}

/** Prisma client'ta workSession modeli var mı (client yeniden üretildiyse true) */
function hasWorkSessionModel(): boolean {
  return typeof (prisma as { workSession?: unknown }).workSession !== 'undefined';
}

/**
 * Bir dosyada hangi çalışanlar ne kadar süre çalışmış.
 */
export async function getFileWorkerBreakdown(fileId: string) {
  if (!hasWorkSessionModel()) {
    return { fileId, byUser: [], sessions: [] };
  }
  const sessions = await prisma.workSession.findMany({
    where: { fileId },
    include: {
      user: { select: { id: true, fullName: true, username: true } },
      department: { select: { id: true, name: true, code: true } },
    },
    orderBy: { startTime: 'asc' },
  });

  const byUser: Record<
    string,
    { userId: string; fullName: string; username: string; totalMinutes: number; sessions: number }
  > = {};

  for (const s of sessions) {
    const minutes = s.durationMinutes ?? computeDurationMinutes(s.startTime, s.endTime);
    if (!byUser[s.userId]) {
      byUser[s.userId] = {
        userId: s.user.id,
        fullName: s.user.fullName,
        username: s.user.username,
        totalMinutes: 0,
        sessions: 0,
      };
    }
    byUser[s.userId].totalMinutes += minutes;
    byUser[s.userId].sessions += 1;
  }

  return {
    fileId,
    byUser: Object.values(byUser),
    sessions,
  };
}

/**
 * Departman bazlı toplam çalışma süresi (belirli aralıkta).
 */
export async function getDepartmentTotalTime(
  departmentId: string,
  options: { period?: 'today' | 'week' | 'month'; from?: Date; to?: Date } = {}
) {
  const { from, to } =
    options.from && options.to
      ? { from: options.from, to: options.to }
      : getDateRange(options.period ?? 'month');

  const sessions = await prisma.workSession.findMany({
    where: {
      departmentId,
      startTime: { gte: from, lte: to },
    },
    include: {
      user: { select: { id: true, fullName: true, username: true } },
      file: { select: { id: true, fileNo: true } },
    },
  });

  let totalMinutes = 0;
  const byUser: Record<string, { userId: string; fullName: string; username: string; totalMinutes: number }> = {};

  for (const s of sessions) {
    const minutes = s.durationMinutes ?? computeDurationMinutes(s.startTime, s.endTime);
    totalMinutes += minutes;
    if (!byUser[s.userId]) {
      byUser[s.userId] = {
        userId: s.user.id,
        fullName: s.user.fullName,
        username: s.user.username,
        totalMinutes: 0,
      };
    }
    byUser[s.userId].totalMinutes += minutes;
  }

  const department = await prisma.department.findUnique({
    where: { id: departmentId },
    select: { id: true, name: true, code: true },
  });

  return {
    department,
    from,
    to,
    totalMinutes,
    totalHours: Math.round((totalMinutes / 60) * 100) / 100,
    byUser: Object.values(byUser),
  };
}
