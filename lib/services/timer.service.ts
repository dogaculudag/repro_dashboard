import { prisma } from '@/lib/db';
import { calculateDuration } from '@/lib/utils';

/**
 * Start a timer for a file
 * Enforces single active timer per file constraint
 */
export async function startTimer(
  fileId: string,
  departmentId: string,
  userId: string | null
) {
  return prisma.$transaction(async (tx) => {
    // Check for existing active timer
    const activeTimer = await tx.timer.findFirst({
      where: { fileId, endTime: null },
    });

    if (activeTimer) {
      throw new Error('Bu dosyada zaten aktif bir zamanlayıcı var');
    }

    // Create new timer
    return tx.timer.create({
      data: {
        fileId,
        departmentId,
        userId,
        startTime: new Date(),
      },
    });
  }, {
    isolationLevel: 'Serializable',
  });
}

/**
 * Stop an active timer
 */
export async function stopTimer(timerId: string) {
  const timer = await prisma.timer.findUnique({
    where: { id: timerId },
  });

  if (!timer) {
    throw new Error('Zamanlayıcı bulunamadı');
  }

  if (timer.endTime) {
    throw new Error('Zamanlayıcı zaten durdurulmuş');
  }

  const endTime = new Date();
  const durationSeconds = calculateDuration(timer.startTime, endTime);

  return prisma.timer.update({
    where: { id: timerId },
    data: {
      endTime,
      durationSeconds,
    },
  });
}

/**
 * Stop active timer for a file (if exists)
 */
export async function stopActiveTimerForFile(fileId: string) {
  const activeTimer = await prisma.timer.findFirst({
    where: { fileId, endTime: null },
  });

  if (activeTimer) {
    return stopTimer(activeTimer.id);
  }

  return null;
}

/**
 * Get active timer for a file
 */
export async function getActiveTimer(fileId: string) {
  return prisma.timer.findFirst({
    where: { fileId, endTime: null },
    include: {
      department: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      user: {
        select: {
          id: true,
          fullName: true,
          username: true,
        },
      },
    },
  });
}

/**
 * Get all timers for a file
 */
export async function getFileTimers(fileId: string) {
  return prisma.timer.findMany({
    where: { fileId },
    include: {
      department: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      user: {
        select: {
          id: true,
          fullName: true,
          username: true,
        },
      },
    },
    orderBy: { startTime: 'asc' },
  });
}

/**
 * Get total time spent by department for a file
 */
export async function getTimeByDepartment(fileId: string) {
  const timers = await prisma.timer.findMany({
    where: { fileId },
    include: {
      department: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
  });

  const departmentTimes: Record<string, {
    departmentId: string;
    departmentName: string;
    departmentCode: string;
    totalSeconds: number;
    entries: number;
  }> = {};

  for (const timer of timers) {
    const deptId = timer.departmentId;
    
    if (!departmentTimes[deptId]) {
      departmentTimes[deptId] = {
        departmentId: deptId,
        departmentName: timer.department.name,
        departmentCode: timer.department.code,
        totalSeconds: 0,
        entries: 0,
      };
    }

    const duration = timer.durationSeconds ?? 
      (timer.endTime ? calculateDuration(timer.startTime, timer.endTime) : 
       calculateDuration(timer.startTime, new Date()));
    
    departmentTimes[deptId].totalSeconds += duration;
    departmentTimes[deptId].entries += 1;
  }

  return Object.values(departmentTimes);
}

/**
 * Check if user has active timer on file
 */
export async function userHasActiveTimer(fileId: string, userId: string) {
  const timer = await prisma.timer.findFirst({
    where: {
      fileId,
      userId,
      endTime: null,
    },
  });
  return !!timer;
}
