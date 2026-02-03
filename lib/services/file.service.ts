import { prisma } from '@/lib/db';
import { FileStatus, Priority, Prisma } from '@prisma/client';
import { createAuditLog } from './audit.service';
import { startTimer, stopActiveTimerForFile, getActiveTimer } from './timer.service';
import { startWork, stopWork, getFileWorkerBreakdown } from './work-session.service';
import type { CreateFileInput, UpdateFileInput, FileQueryInput, AdminUpdateFileInput } from '@/lib/validations';
import { calculateElapsedSeconds } from '@/lib/utils';

/**
 * Create a new file
 */
export async function createFile(
  input: CreateFileInput,
  userId: string,
  departmentId: string
) {
  // Get Önrepro department for initial state
  const onreproDept = await prisma.department.findUnique({
    where: { code: 'ONREPRO' },
  });

  if (!onreproDept) {
    throw new Error('Önrepro departmanı bulunamadı');
  }

  const genelFileType = await prisma.fileType.findFirst({
    where: { name: 'GENEL' },
  });

  const file = await prisma.file.create({
    data: {
      fileNo: input.fileNo,
      customerName: input.customerName,
      customerNo: input.customerNo,
      ksmData: input.ksmData ?? Prisma.JsonNull,
      status: FileStatus.AWAITING_ASSIGNMENT,
      currentDepartmentId: onreproDept.id,
      currentLocationSlotId: input.locationSlotId,
      fileTypeId: genelFileType?.id ?? undefined,
      difficultyLevel: 3,
      difficultyWeight: 1.0,
      requiresApproval: input.requiresApproval,
      priority: input.priority as Priority,
    },
    include: {
      currentDepartment: true,
      currentLocationSlot: true,
      fileType: true,
    },
  });

  // Create audit log
  await createAuditLog({
    fileId: file.id,
    actionType: 'CREATE',
    byUserId: userId,
    toDepartmentId: onreproDept.id,
    payload: { fileNo: file.fileNo, customerName: file.customerName },
  });

  return file;
}

/**
 * Get a file by ID with all relations
 */
export async function getFileById(id: string) {
  const file = await prisma.file.findUnique({
    where: { id },
    include: {
      assignedDesigner: {
        select: {
          id: true,
          fullName: true,
          username: true,
        },
      },
      currentDepartment: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      currentLocationSlot: {
        select: {
          id: true,
          code: true,
          name: true,
          area: true,
          row: true,
          column: true,
        },
      },
      fileType: {
        select: { id: true, name: true },
      },
    },
  });

  if (!file) return null;

  // Get active timer
  const activeTimer = await getActiveTimer(id);
  // Çalışan bazlı süre: bu dosyada kim ne kadar çalıştı (WorkSession modeli yoksa boş dizi)
  const workerBreakdown = await getFileWorkerBreakdown(id).catch(() => ({ byUser: [] }));

  return {
    ...file,
    activeTimer: activeTimer ? {
      id: activeTimer.id,
      departmentId: activeTimer.departmentId,
      userId: activeTimer.userId,
      startTime: activeTimer.startTime,
      elapsedSeconds: calculateElapsedSeconds(activeTimer.startTime),
    } : null,
    workerBreakdown: workerBreakdown.byUser ?? [],
  };
}

/**
 * Get file by file number
 */
export async function getFileByFileNo(fileNo: string) {
  const file = await prisma.file.findUnique({
    where: { fileNo },
  });
  
  if (!file) return null;
  
  return getFileById(file.id);
}

/**
 * List files with filters and pagination
 */
export async function listFiles(query: FileQueryInput) {
  const where: Prisma.FileWhereInput = {};

  if (query.status) {
    const statuses = query.status.split(',') as FileStatus[];
    where.status = { in: statuses };
  }

  if (query.departmentId) {
    where.currentDepartmentId = query.departmentId;
  }

  if (query.assignedDesignerId) {
    where.assignedDesignerId = query.assignedDesignerId;
  }

  if (query.pendingTakeover !== undefined) {
    where.pendingTakeover = query.pendingTakeover;
  }

  if (query.priority) {
    const priorities = query.priority.split(',') as Priority[];
    where.priority = { in: priorities };
  }

  if (query.search) {
    where.OR = [
      { fileNo: { contains: query.search, mode: 'insensitive' } },
      { customerName: { contains: query.search, mode: 'insensitive' } },
      { customerNo: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  const [files, total] = await Promise.all([
    prisma.file.findMany({
      where,
      include: {
        assignedDesigner: {
          select: {
            id: true,
            fullName: true,
            username: true,
          },
        },
        currentDepartment: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        currentLocationSlot: {
          select: {
            id: true,
            code: true,
            name: true,
            area: true,
          },
        },
      },
      orderBy: { [query.sortBy]: query.sortOrder },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.file.count({ where }),
  ]);

  return {
    files,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

/**
 * Update a file
 */
export async function updateFile(
  id: string,
  input: UpdateFileInput,
  userId: string
) {
  const data: Prisma.FileUpdateInput = {};

  if (input.customerName) data.customerName = input.customerName;
  if (input.customerNo !== undefined) data.customerNo = input.customerNo;
  if (input.ksmData !== undefined) data.ksmData = input.ksmData ?? Prisma.JsonNull;
  if (input.locationSlotId) data.currentLocationSlot = { connect: { id: input.locationSlotId } };
  if (input.priority) data.priority = input.priority as Priority;
  if (input.requiresApproval !== undefined) data.requiresApproval = input.requiresApproval;

  const file = await prisma.file.update({
    where: { id },
    data,
    include: {
      assignedDesigner: {
        select: { id: true, fullName: true, username: true },
      },
      currentDepartment: {
        select: { id: true, name: true, code: true },
      },
      currentLocationSlot: {
        select: { id: true, code: true, name: true, area: true },
      },
    },
  });

  return file;
}

/**
 * Admin: Update file assignment, file type, difficulty (assignedUserId, fileTypeId, difficultyLevel, difficultyWeight).
 */
export async function adminUpdateFile(id: string, input: AdminUpdateFileInput) {
  const data: Prisma.FileUpdateInput = {};
  if (input.assignedUserId !== undefined) {
    data.assignedDesignerId = input.assignedUserId;
  }
  if (input.fileTypeId !== undefined) {
    data.fileTypeId = input.fileTypeId;
  }
  if (input.difficultyLevel !== undefined) {
    data.difficultyLevel = input.difficultyLevel;
  }
  if (input.difficultyWeight !== undefined) {
    data.difficultyWeight = input.difficultyWeight;
  }
  return prisma.file.update({
    where: { id },
    data,
    include: {
      assignedDesigner: { select: { id: true, fullName: true, username: true } },
      currentDepartment: { select: { id: true, name: true, code: true } },
      fileType: { select: { id: true, name: true } },
    },
  });
}

/**
 * Assign file to designer
 */
export async function assignFile(
  fileId: string,
  designerId: string,
  managerId: string,
  note?: string
) {
  const file = await prisma.file.findUnique({
    where: { id: fileId },
  });

  if (!file) {
    throw new Error('Dosya bulunamadı');
  }

  if (file.status !== FileStatus.AWAITING_ASSIGNMENT) {
    throw new Error('Dosya atama için uygun değil');
  }

  // Get designer and repro department
  const [designer, reproDept] = await Promise.all([
    prisma.user.findUnique({
      where: { id: designerId },
      select: { id: true, fullName: true, departmentId: true },
    }),
    prisma.department.findUnique({ where: { code: 'REPRO' } }),
  ]);

  if (!designer) {
    throw new Error('Tasarımcı bulunamadı');
  }

  if (!reproDept) {
    throw new Error('Repro departmanı bulunamadı');
  }

  const updatedFile = await prisma.file.update({
    where: { id: fileId },
    data: {
      assignedDesignerId: designerId,
      status: FileStatus.ASSIGNED,
      currentDepartmentId: reproDept.id,
      pendingTakeover: true,
    },
    include: {
      assignedDesigner: {
        select: { id: true, fullName: true, username: true },
      },
      currentDepartment: {
        select: { id: true, name: true, code: true },
      },
    },
  });

  // Create audit log
  await createAuditLog({
    fileId,
    actionType: 'ASSIGN',
    byUserId: managerId,
    toDepartmentId: reproDept.id,
    payload: {
      assignedTo: designer.fullName,
      designerId: designer.id,
      note,
    },
  });

  // Add note if provided
  if (note) {
    await prisma.note.create({
      data: {
        fileId,
        userId: managerId,
        departmentId: reproDept.id,
        message: note,
        isSystem: false,
      },
    });
  }

  return updatedFile;
}

/**
 * Takeover (Devral) - user takes physical possession of file
 */
export async function takeoverFile(
  fileId: string,
  userId: string,
  userDepartmentId: string,
  locationSlotId?: string,
  note?: string
) {
  const file = await prisma.file.findUnique({
    where: { id: fileId },
    include: {
      assignedDesigner: true,
      currentDepartment: true,
    },
  });

  if (!file) {
    throw new Error('Dosya bulunamadı');
  }

  if (file.status === FileStatus.SENT_TO_PRODUCTION) {
    throw new Error('Üretime gönderilmiş dosya devralınamaz');
  }

  // Validate takeover permission: dosya kullanıcının departmanındaysa veya atanmış tasarımcıysa devralabilir
  const canTakeover =
    file.currentDepartmentId === userDepartmentId ||
    ((file.status === FileStatus.ASSIGNED || file.status === FileStatus.REVISION_REQUIRED) &&
      file.assignedDesignerId === userId);

  if (!canTakeover) {
    throw new Error('Bu dosyayı devralmaya yetkiniz yok');
  }

  // Stop any existing active timer
  await stopActiveTimerForFile(fileId);

  // Determine new status based on department
  const department = await prisma.department.findUnique({
    where: { id: userDepartmentId },
  });

  let newStatus = file.status;
  if (department?.code === 'REPRO') {
    newStatus = FileStatus.IN_REPRO;
  } else if (department?.code === 'KALITE') {
    newStatus = FileStatus.IN_QUALITY;
  } else if (department?.code === 'KOLAJ') {
    newStatus = FileStatus.IN_KOLAJ;
  }

  // Update file
  const updatedFile = await prisma.file.update({
    where: { id: fileId },
    data: {
      status: newStatus,
      currentDepartmentId: userDepartmentId,
      pendingTakeover: false,
      ...(locationSlotId && { currentLocationSlotId: locationSlotId }),
    },
    include: {
      assignedDesigner: {
        select: { id: true, fullName: true, username: true },
      },
      currentDepartment: {
        select: { id: true, name: true, code: true },
      },
      currentLocationSlot: {
        select: { id: true, code: true, name: true, area: true },
      },
    },
  });

  // Start new timer
  await startTimer(fileId, userDepartmentId, userId);
  // Çalışan bazlı takip: bu kullanıcı bu dosyada çalışmaya başladı
  await startWork(userId, fileId);

  // Create audit log
  await createAuditLog({
    fileId,
    actionType: 'TAKEOVER',
    byUserId: userId,
    fromDepartmentId: file.currentDepartmentId,
    toDepartmentId: userDepartmentId,
    payload: { previousStatus: file.status, newStatus, note },
  });

  // Add note if provided
  if (note) {
    await prisma.note.create({
      data: {
        fileId,
        userId,
        departmentId: userDepartmentId,
        message: note,
        isSystem: false,
      },
    });
  }

  return updatedFile;
}

/**
 * Get unassigned files (for manager)
 */
export async function getUnassignedFiles() {
  return prisma.file.findMany({
    where: { status: FileStatus.AWAITING_ASSIGNMENT },
    include: {
      currentLocationSlot: {
        select: { id: true, code: true, name: true },
      },
    },
    orderBy: [
      { priority: 'desc' },
      { createdAt: 'asc' },
    ],
  });
}

/**
 * Get files for department queue
 */
export async function getDepartmentQueue(departmentId: string, userId: string) {
  const [activeFiles, pendingTakeover] = await Promise.all([
    // Files with active timer by this user
    prisma.file.findMany({
      where: {
        currentDepartmentId: departmentId,
        pendingTakeover: false,
        status: { notIn: [FileStatus.SENT_TO_PRODUCTION] },
        timers: {
          some: {
            userId,
            endTime: null,
          },
        },
      },
      include: {
        assignedDesigner: {
          select: { id: true, fullName: true },
        },
        currentLocationSlot: {
          select: { id: true, code: true, name: true },
        },
        timers: {
          where: { endTime: null },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    }),
    // Files pending takeover
    prisma.file.findMany({
      where: {
        currentDepartmentId: departmentId,
        pendingTakeover: true,
      },
      include: {
        assignedDesigner: {
          select: { id: true, fullName: true },
        },
        currentLocationSlot: {
          select: { id: true, code: true, name: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    }),
  ]);

  return { activeFiles, pendingTakeover };
}

/**
 * Get designer's assigned files
 */
export async function getDesignerFiles(designerId: string) {
  return prisma.file.findMany({
    where: {
      assignedDesignerId: designerId,
      status: { notIn: [FileStatus.SENT_TO_PRODUCTION] },
    },
    include: {
      currentDepartment: {
        select: { id: true, name: true, code: true },
      },
      currentLocationSlot: {
        select: { id: true, code: true, name: true },
      },
      timers: {
        where: { endTime: null },
        take: 1,
      },
    },
    orderBy: [
      { priority: 'desc' },
      { updatedAt: 'desc' },
    ],
  });
}
