import { prisma } from '@/lib/db';
import { ActionType, FileStatus, Stage } from '@prisma/client';

/**
 * Claim Pre-Repro (Devral): set current assignee to the claiming user.
 * Only allowed when stage is PRE_REPRO and assignedDesignerId is null.
 * Uses atomic update (where: id + assignedDesignerId null) to prevent double-claim.
 */
export async function claimPreReproFile({ fileId, userId }: { fileId: string; userId: string }) {
  const file = await prisma.file.findUnique({
    where: { id: fileId },
    select: { id: true, stage: true, assignedDesignerId: true, currentDepartmentId: true },
  });

  if (!file) {
    throw new Error('Dosya bulunamadı');
  }
  if (file.stage !== Stage.PRE_REPRO) {
    throw new Error('Dosya Ön Repro aşamasında değil');
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const updatedFile = await tx.file.update({
        where: { id: fileId, assignedDesignerId: null },
        data: { assignedDesignerId: userId },
        include: {
          assignedDesigner: { select: { id: true, fullName: true, username: true } },
          targetAssignee: { select: { id: true, fullName: true, username: true } },
          currentDepartment: { select: { id: true, name: true, code: true } },
        },
      });
      await tx.auditLog.create({
        data: {
          fileId,
          actionType: 'PRE_REPRO_CLAIMED',
          byUserId: userId,
          payload: { claimedBy: userId },
        },
      });
      // Devralınca otomatik timer başlat: "Üzerinde Çalıştıklarım"da görünsün
      const activeTimer = await tx.timer.findFirst({
        where: { fileId, endTime: null },
      });
      if (!activeTimer) {
        await tx.timer.create({
          data: {
            fileId,
            departmentId: updatedFile.currentDepartmentId,
            userId,
            startTime: new Date(),
          },
        });
      }
      return updatedFile;
    });
    return updated;
  } catch (err: unknown) {
    const prismaErr = err as { code?: string };
    if (prismaErr?.code === 'P2025') {
      throw new Error('Dosya zaten başka biri tarafından devralınmış');
    }
    throw err;
  }
}

/**
 * Resolve the user id to assign to when devret has no target (default: Bahar).
 * Uses BAHAR_USER_ID env or user with username 'bahar'.
 */
async function getBaharUserId(): Promise<string> {
  const envId = process.env.BAHAR_USER_ID?.trim();
  if (envId) {
    const u = await prisma.user.findUnique({ where: { id: envId }, select: { id: true } });
    if (u) return u.id;
  }
  const bahar = await prisma.user.findFirst({
    where: { username: 'bahar' },
    select: { id: true },
  });
  if (bahar) return bahar.id;
  throw new Error('BAHAR_USER_ID tanımlı değil ve kullanıcı "bahar" bulunamadı');
}

/**
 * Handoff Pre-Repro (Devret): set stage to REPRO, assign file to target assignee
 * (or Bahar if no target), and move to REPRO department so file appears in designer's "Dosyalarım".
 */
export async function completePreReproFile({
  fileId,
  userId,
}: {
  fileId: string;
  userId: string;
}) {
  const file = await prisma.file.findUnique({
    where: { id: fileId },
    select: {
      id: true,
      stage: true,
      assignedDesignerId: true,
      targetAssigneeId: true,
    },
  });

  if (!file) {
    throw new Error('Dosya bulunamadı');
  }
  if (file.stage !== Stage.PRE_REPRO) {
    throw new Error('Dosya Ön Repro aşamasında değil');
  }
  if (file.assignedDesignerId !== userId) {
    throw new Error('Devretmek için önce bu dosyayı devralmış olmalısınız');
  }

  const reproDept = await prisma.department.findUnique({ where: { code: 'REPRO' } });
  if (!reproDept) {
    throw new Error('Repro departmanı bulunamadı');
  }

  const toAssigneeId = file.targetAssigneeId ?? (await getBaharUserId());

  const updated = await prisma.$transaction(async (tx) => {
    const updatedFile = await tx.file.update({
      where: { id: fileId },
      data: {
        stage: Stage.REPRO,
        assignedDesignerId: toAssigneeId,
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
    await tx.auditLog.create({
      data: {
        fileId,
        actionType: 'PRE_REPRO_HANDED_OFF',
        byUserId: userId,
        toDepartmentId: reproDept.id,
        payload: {
          fromStage: 'PRE_REPRO',
          toStage: 'REPRO',
          fromAssignee: userId,
          toAssignee: toAssigneeId,
        },
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
export async function returnPreReproToQueue({ fileId, userId }: { fileId: string; userId: string }) {
  const file = await prisma.file.findUnique({
    where: { id: fileId },
    select: { id: true, stage: true, assignedDesignerId: true },
  });

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
    await tx.auditLog.create({
      data: {
        fileId,
        actionType: 'PRE_REPRO_RETURNED_TO_QUEUE' as ActionType,
        byUserId: userId,
        payload: { returnedBy: userId },
      },
    });
    return updatedFile;
  });

  return updated;
}
