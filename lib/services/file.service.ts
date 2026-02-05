import { prisma } from '@/lib/db';
import { ActionType, FileStatus, Priority, Prisma, Stage } from '@prisma/client';
import { createAuditLog } from './audit.service';
import { startTimer, stopActiveTimerForFile, getActiveTimer } from './timer.service';
import { startWork, stopWork, getFileWorkerBreakdown } from './work-session.service';
import type { CreateFileInput, UpdateFileInput, FileQueryInput, AdminUpdateFileInput, KsmTechnicalDataUpdateInput } from '@/lib/validations';
import type { KsmTechnicalData } from '@/lib/ksm-technical-data';
import { calculateElapsedSeconds } from '@/lib/utils';

const FILE_NO_PREFIX = 'REP';
const FILE_NO_YEAR = new Date().getFullYear();

/**
 * Generate next file number in format REP-YYYY-NNNN
 */
export async function getNextFileNo(): Promise<string> {
  const prefix = `${FILE_NO_PREFIX}-${FILE_NO_YEAR}-`;
  const files = await prisma.file.findMany({
    where: { fileNo: { startsWith: prefix } },
    select: { fileNo: true },
    orderBy: { fileNo: 'desc' },
    take: 1,
  });
  const nextNum = files.length === 0
    ? 1
    : (parseInt(files[0].fileNo.replace(prefix, ''), 10) || 0) + 1;
  return `${prefix}${String(nextNum).padStart(4, '0')}`;
}

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

  const fileNo = input.fileNo?.trim()
    ? input.fileNo.trim()
    : await getNextFileNo();

  const file = await prisma.file.create({
    data: {
      fileNo,
      customerName: input.customerName,
      customerNo: input.customerNo,
      sapNumber: input.sapNumber ?? undefined,
      orderName: input.orderName ?? undefined,
      designNo: input.designNo ?? undefined,
      revisionNo: input.revisionNo ?? undefined,
      dueDate: input.dueDate ?? undefined,
      ksmData: input.ksmData ?? Prisma.JsonNull,
      status: FileStatus.AWAITING_ASSIGNMENT,
      stage: Stage.PRE_REPRO,
      targetAssigneeId: input.targetAssigneeId,
      assignedDesignerId: null,
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
      targetAssignee: { select: { id: true, fullName: true, username: true } },
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
      targetAssignee: {
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

  if (query.assignmentPoolOnly) {
    where.targetAssigneeId = null;
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
  if (input.sapNumber !== undefined) data.sapNumber = input.sapNumber;
  if (input.orderName !== undefined) data.orderName = input.orderName;
  if (input.designNo !== undefined) data.designNo = input.designNo;
  if (input.revisionNo !== undefined) data.revisionNo = input.revisionNo;
  if (input.dueDate !== undefined) data.dueDate = input.dueDate;
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
    data.assignedDesigner = input.assignedUserId
      ? { connect: { id: input.assignedUserId } }
      : { disconnect: true };
  }
  if (input.fileTypeId !== undefined) {
    data.fileType = input.fileTypeId
      ? { connect: { id: input.fileTypeId } }
      : { disconnect: true };
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
 * Update only KSM technical data normalized layer (raw is never written by API).
 */
export async function updateKsmTechnicalDataNormalized(
  fileId: string,
  input: KsmTechnicalDataUpdateInput
) {
  const file = await prisma.file.findUnique({
    where: { id: fileId },
    select: { ksmTechnicalData: true },
  });
  if (!file) throw new Error('Dosya bulunamadı');

  const current = (file.ksmTechnicalData ?? {}) as KsmTechnicalData;
  const normalized = { ...(current.normalized ?? {}), ...input.normalized };
  const ksmTechnicalData: KsmTechnicalData = {
    raw: current.raw,
    normalized: normalized as KsmTechnicalData['normalized'],
  };

  return prisma.file.update({
    where: { id: fileId },
    data: { ksmTechnicalData: ksmTechnicalData as unknown as Prisma.JsonObject },
    include: {
      assignedDesigner: { select: { id: true, fullName: true, username: true } },
      currentDepartment: { select: { id: true, name: true, code: true } },
      fileType: { select: { id: true, name: true } },
    },
  });
}

/**
 * Assign file to Pre-Repro queue with target designer (grafiker).
 * File does NOT go to designer's list until Ön Repro user hands off via "Devret".
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

  // Get designer (target grafiker) and Ön Repro department
  const [designer, onreproDept] = await Promise.all([
    prisma.user.findUnique({
      where: { id: designerId },
      select: { id: true, fullName: true, departmentId: true },
    }),
    prisma.department.findUnique({ where: { code: 'ONREPRO' } }),
  ]);

  if (!designer) {
    throw new Error('Tasarımcı bulunamadı');
  }

  if (!onreproDept) {
    throw new Error('Ön Repro departmanı bulunamadı');
  }

  const updatedFile = await prisma.file.update({
    where: { id: fileId },
    data: {
      targetAssigneeId: designerId,
      assignedDesignerId: null,
      stage: Stage.PRE_REPRO,
      currentDepartmentId: onreproDept.id,
      // status stays AWAITING_ASSIGNMENT; pool filters by targetAssigneeId == null
    },
    include: {
      targetAssignee: {
        select: { id: true, fullName: true, username: true },
      },
      currentDepartment: {
        select: { id: true, name: true, code: true },
      },
    },
  });

  // Create audit log (sent to Pre-Repro queue, target grafiker stored)
  await createAuditLog({
    fileId,
    actionType: 'ASSIGN',
    byUserId: managerId,
    toDepartmentId: onreproDept.id,
    payload: {
      targetDesignerId: designer.id,
      targetDesignerName: designer.fullName,
      sentToPreReproQueue: true,
      note,
    },
  });

  // Add note if provided
  if (note) {
    await prisma.note.create({
      data: {
        fileId,
        userId: managerId,
        departmentId: onreproDept.id,
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
 * Get designer's assigned files (only REPRO stage – PRE_REPRO never appears in designer list)
 */
export async function getDesignerFiles(designerId: string) {
  return prisma.file.findMany({
    where: {
      assignedDesignerId: designerId,
      stage: Stage.REPRO,
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

/**
 * Get files in Pre-Repro queue (stage = PRE_REPRO)
 */
export async function getPreReproQueue() {
  return prisma.file.findMany({
    where: { stage: Stage.PRE_REPRO },
    include: {
      targetAssignee: {
        select: { id: true, fullName: true, username: true },
      },
      assignedDesigner: {
        select: { id: true, fullName: true, username: true },
      },
      currentDepartment: {
        select: { id: true, name: true, code: true },
      },
      currentLocationSlot: {
        select: { id: true, code: true, name: true },
      },
    },
    orderBy: [{ createdAt: 'asc' }],
  });
}

/**
 * Claim Pre-Repro (Devral): set current assignee to the claiming user.
 * Only allowed when stage is PRE_REPRO and assignedDesignerId is null.
 */
export async function claimPreRepro(fileId: string, userId: string) {
  const file = await getFileById(fileId);
  if (!file) {
    throw new Error('Dosya bulunamadı');
  }
  if (file.stage !== Stage.PRE_REPRO) {
    throw new Error('Dosya Ön Repro aşamasında değil');
  }
  if (file.assignedDesignerId != null) {
    throw new Error('Dosya zaten başka biri tarafından devralınmış');
  }

  const updated = await prisma.$transaction(async (tx) => {
    const updatedFile = await tx.file.update({
      where: { id: fileId },
      data: { assignedDesignerId: userId },
      include: {
        assignedDesigner: { select: { id: true, fullName: true, username: true } },
        targetAssignee: { select: { id: true, fullName: true, username: true } },
        currentDepartment: { select: { id: true, name: true, code: true } },
      },
    });
    await createAuditLog({
      fileId,
      actionType: 'PRE_REPRO_CLAIMED',
      byUserId: userId,
      payload: { claimedBy: userId },
    });
    return updatedFile;
  });

  return updated;
}

/**
 * Handoff Pre-Repro (Devret): set stage to REPRO, assign file to target assignee,
 * and move to REPRO department so file appears in designer's "Dosyalarım" as pending takeover.
 */
export async function completePreRepro(fileId: string, userId: string) {
  const file = await getFileById(fileId);
  if (!file) {
    throw new Error('Dosya bulunamadı');
  }
  if (file.stage !== Stage.PRE_REPRO) {
    throw new Error('Dosya Ön Repro aşamasında değil');
  }
  if (file.assignedDesignerId !== userId) {
    throw new Error('Devretmek için önce bu dosyayı devralmış olmalısınız');
  }
  if (!file.targetAssigneeId) {
    throw new Error('Dosyada hedef atanacak kişi tanımlı değil');
  }

  const reproDept = await prisma.department.findUnique({ where: { code: 'REPRO' } });
  if (!reproDept) {
    throw new Error('Repro departmanı bulunamadı');
  }

  const updated = await prisma.$transaction(async (tx) => {
    const updatedFile = await tx.file.update({
      where: { id: fileId },
      data: {
        stage: Stage.REPRO,
        assignedDesignerId: file.targetAssigneeId,
        currentDepartmentId: reproDept.id,
        status: FileStatus.ASSIGNED,
        pendingTakeover: true,
      },
      include: {
        assignedDesigner: { select: { id: true, fullName: true, username: true } },
        targetAssignee: { select: { id: true, fullName: true, username: true } },
        currentDepartment: { select: { id: true, name: true, code: true } },
      },
    });
    await createAuditLog({
      fileId,
      actionType: 'PRE_REPRO_HANDED_OFF',
      byUserId: userId,
      toDepartmentId: reproDept.id,
      payload: {
        fromStage: 'PRE_REPRO',
        toStage: 'REPRO',
        fromAssignee: userId,
        toAssignee: file.targetAssigneeId,
      },
    });
    return updatedFile;
  });

  return updated;
}

/**
 * Return Pre-Repro file to queue (Geri Kuyruğa At).
 * Only allowed when stage is PRE_REPRO and assignedDesignerId === currentUserId.
 */
export async function returnPreReproToQueue(fileId: string, userId: string) {
  const file = await getFileById(fileId);
  if (!file) {
    throw new Error('Dosya bulunamadı');
  }
  if (file.stage !== Stage.PRE_REPRO) {
    throw new Error('Dosya Ön Repro aşamasında değil');
  }
  if (file.assignedDesignerId !== userId) {
    throw new Error('Sadece dosyayı devralmış kişi geri kuyruğa atabilir');
  }

  const updated = await prisma.$transaction(async (tx) => {
    const updatedFile = await tx.file.update({
      where: { id: fileId },
      data: { assignedDesignerId: null },
      include: {
        assignedDesigner: { select: { id: true, fullName: true, username: true } },
        targetAssignee: { select: { id: true, fullName: true, username: true } },
        currentDepartment: { select: { id: true, name: true, code: true } },
      },
    });
    await createAuditLog({
      fileId,
      actionType: 'PRE_REPRO_RETURNED_TO_QUEUE' as ActionType,
      byUserId: userId,
      payload: { returnedBy: userId },
    });
    return updatedFile;
  });

  return updated;
}
