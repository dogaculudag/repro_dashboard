import { prisma } from '@/lib/db';
import { FileStatus } from '@prisma/client';
import { createAuditLog } from './audit.service';
import { startTimer, stopActiveTimerForFile } from './timer.service';
import { stopWork } from './work-session.service';

/**
 * Request approval - Designer sends to Önrepro
 */
export async function requestApproval(
  fileId: string,
  userId: string,
  note?: string
) {
  const file = await prisma.file.findUnique({
    where: { id: fileId },
    include: { assignedDesigner: true },
  });

  if (!file) throw new Error('Dosya bulunamadı');
  if (file.status !== FileStatus.IN_REPRO) throw new Error('Dosya uygun durumda değil');
  if (file.assignedDesignerId !== userId) throw new Error('Bu dosya size atanmamış');

  // Stop current timer and work session (dosya departmandan çıkıyor)
  await stopActiveTimerForFile(fileId);
  await stopWork(userId).catch(() => {});

  // Kalite RED'den dönen dosya: REPRO bitişi direkt KOLAJ'a
  if (file.qualityNokReturn === true) {
    const kolajDept = await prisma.department.findUnique({ where: { code: 'KOLAJ' } });
    if (!kolajDept) throw new Error('Kolaj departmanı bulunamadı');

    const updatedFile = await prisma.file.update({
      where: { id: fileId },
      data: {
        status: FileStatus.IN_KOLAJ,
        currentDepartmentId: kolajDept.id,
        pendingTakeover: true,
        qualityNokReturn: false,
      },
    });

    await createAuditLog({
      fileId,
      actionType: 'TRANSFER',
      byUserId: userId,
      fromDepartmentId: file.currentDepartmentId,
      toDepartmentId: kolajDept.id,
      payload: { action: 'REPRO_DONE_AFTER_QUALITY_NOK_TO_KOLAJ', note },
    });

    if (note) {
      await prisma.note.create({
        data: {
          fileId,
          userId,
          departmentId: file.currentDepartmentId,
          message: note,
        },
      });
    }

    return updatedFile;
  }

  if (!file.requiresApproval) throw new Error('Bu dosya onay gerektirmiyor');

  // Get Önrepro department
  const onreproDept = await prisma.department.findUnique({ where: { code: 'ONREPRO' } });
  if (!onreproDept) throw new Error('Önrepro departmanı bulunamadı');

  // Update file
  const updatedFile = await prisma.file.update({
    where: { id: fileId },
    data: {
      status: FileStatus.APPROVAL_PREP,
      currentDepartmentId: onreproDept.id,
      pendingTakeover: true,
    },
  });

  await createAuditLog({
    fileId,
    actionType: 'TRANSFER',
    byUserId: userId,
    fromDepartmentId: file.currentDepartmentId,
    toDepartmentId: onreproDept.id,
    payload: { action: 'REQUEST_APPROVAL', note },
  });

  if (note) {
    await prisma.note.create({
      data: {
        fileId,
        userId,
        departmentId: file.currentDepartmentId,
        message: note,
      },
    });
  }

  return updatedFile;
}

/**
 * Send to customer approval
 */
export async function sendToCustomer(
  fileId: string,
  userId: string,
  userDepartmentId: string,
  note?: string
) {
  const file = await prisma.file.findUnique({ where: { id: fileId } });

  if (!file) throw new Error('Dosya bulunamadı');
  if (file.status !== FileStatus.APPROVAL_PREP) throw new Error('Dosya uygun durumda değil');

  // Stop current timer and work session
  await stopActiveTimerForFile(fileId);
  await stopWork(userId).catch(() => {});

  // Get Customer department (virtual)
  const customerDept = await prisma.department.findUnique({ where: { code: 'CUSTOMER' } });
  if (!customerDept) throw new Error('Müşteri departmanı bulunamadı');

  // Update file
  const updatedFile = await prisma.file.update({
    where: { id: fileId },
    data: {
      status: FileStatus.CUSTOMER_APPROVAL,
      currentDepartmentId: customerDept.id,
      pendingTakeover: false,
    },
  });

  // Start customer timer (null user for virtual department)
  await startTimer(fileId, customerDept.id, null);

  await createAuditLog({
    fileId,
    actionType: 'CUSTOMER_SENT',
    byUserId: userId,
    fromDepartmentId: userDepartmentId,
    toDepartmentId: customerDept.id,
    payload: { note },
  });

  if (note) {
    await prisma.note.create({
      data: {
        fileId,
        userId,
        departmentId: userDepartmentId,
        message: note,
      },
    });
  }

  return updatedFile;
}

/**
 * Customer OK - proceed to quality
 */
export async function customerOk(
  fileId: string,
  userId: string,
  userDepartmentId: string,
  note?: string
) {
  const file = await prisma.file.findUnique({ where: { id: fileId } });

  if (!file) throw new Error('Dosya bulunamadı');
  if (file.status !== FileStatus.CUSTOMER_APPROVAL) throw new Error('Dosya uygun durumda değil');

  // Stop customer timer and work session
  await stopActiveTimerForFile(fileId);
  await stopWork(userId).catch(() => {});

  const kaliteDept = await prisma.department.findUnique({ where: { code: 'KALITE' } });
  if (!kaliteDept) throw new Error('Kalite departmanı bulunamadı');

  const kolajDept = await prisma.department.findUnique({ where: { code: 'KOLAJ' } });
  if (!kolajDept) throw new Error('Kolaj departmanı bulunamadı');

  if (file.skipQualityAfterCustomerOk === true) {
    const updatedFile = await prisma.file.update({
      where: { id: fileId },
      data: {
        status: FileStatus.IN_KOLAJ,
        currentDepartmentId: kolajDept.id,
        pendingTakeover: true,
        skipQualityAfterCustomerOk: false,
      },
    });

    await createAuditLog({
      fileId,
      actionType: 'CUSTOMER_OK',
      byUserId: userId,
      fromDepartmentId: file.currentDepartmentId,
      toDepartmentId: kolajDept.id,
      payload: { note, skipQuality: true },
    });

    if (note) {
      await prisma.note.create({
        data: {
          fileId,
          userId,
          departmentId: userDepartmentId,
          message: `Müşteri onayladı: ${note}`,
        },
      });
    }

    return updatedFile;
  }

  // Normal flow: CUSTOMER_OK -> KALİTE
  const updatedFile = await prisma.file.update({
    where: { id: fileId },
    data: {
      status: FileStatus.IN_QUALITY,
      currentDepartmentId: kaliteDept.id,
      pendingTakeover: true,
    },
  });

  await createAuditLog({
    fileId,
    actionType: 'CUSTOMER_OK',
    byUserId: userId,
    fromDepartmentId: file.currentDepartmentId,
    toDepartmentId: kaliteDept.id,
    payload: { note },
  });

  if (note) {
    await prisma.note.create({
      data: {
        fileId,
        userId,
        departmentId: userDepartmentId,
        message: `Müşteri onayladı: ${note}`,
      },
    });
  }

  return updatedFile;
}

/**
 * Customer NOK - return to same designer
 */
export async function customerNok(
  fileId: string,
  userId: string,
  userDepartmentId: string,
  note: string
) {
  const file = await prisma.file.findUnique({ where: { id: fileId } });

  if (!file) throw new Error('Dosya bulunamadı');
  if (file.status !== FileStatus.CUSTOMER_APPROVAL) throw new Error('Dosya uygun durumda değil');
  if (!file.assignedDesignerId) throw new Error('Dosyaya atanmış tasarımcı yok');

  // Stop customer timer and work session
  await stopActiveTimerForFile(fileId);
  await stopWork(userId).catch(() => {});

  // Get Repro department
  const reproDept = await prisma.department.findUnique({ where: { code: 'REPRO' } });
  if (!reproDept) throw new Error('Repro departmanı bulunamadı');

  // Update file - IMPORTANT: assignedDesignerId stays the same!
  const updatedFile = await prisma.file.update({
    where: { id: fileId },
    data: {
      status: FileStatus.REVISION_REQUIRED,
      currentDepartmentId: reproDept.id,
      pendingTakeover: true,
    },
  });

  await createAuditLog({
    fileId,
    actionType: 'CUSTOMER_NOK',
    byUserId: userId,
    fromDepartmentId: file.currentDepartmentId,
    toDepartmentId: reproDept.id,
    payload: { note, returnToDesigner: file.assignedDesignerId },
  });

  // Mandatory note for NOK
  await prisma.note.create({
    data: {
      fileId,
      userId,
      departmentId: userDepartmentId,
      message: `Müşteri reddetti: ${note}`,
    },
  });

  return updatedFile;
}

/**
 * Restart from Önrepro (MG2/MG3)
 */
export async function restartMg(
  fileId: string,
  userId: string,
  userDepartmentId: string,
  note: string
) {
  const file = await prisma.file.findUnique({ where: { id: fileId } });

  if (!file) throw new Error('Dosya bulunamadı');
  if (file.status !== FileStatus.CUSTOMER_APPROVAL) throw new Error('Dosya uygun durumda değil');

  // Stop customer timer and work session
  await stopActiveTimerForFile(fileId);
  await stopWork(userId).catch(() => {});

  // Get Önrepro department
  const onreproDept = await prisma.department.findUnique({ where: { code: 'ONREPRO' } });
  if (!onreproDept) throw new Error('Önrepro departmanı bulunamadı');

  // Increment iteration
  const newIterationNumber = file.iterationNumber + 1;
  const newIterationLabel = `MG${newIterationNumber}`;

  // Update file - IMPORTANT: assignedDesignerId stays the same!
  const updatedFile = await prisma.file.update({
    where: { id: fileId },
    data: {
      status: FileStatus.APPROVAL_PREP,
      currentDepartmentId: onreproDept.id,
      pendingTakeover: true,
      iterationNumber: newIterationNumber,
      iterationLabel: newIterationLabel,
    },
  });

  await createAuditLog({
    fileId,
    actionType: 'RESTART_MG',
    byUserId: userId,
    fromDepartmentId: file.currentDepartmentId,
    toDepartmentId: onreproDept.id,
    payload: {
      note,
      previousIteration: file.iterationLabel,
      newIteration: newIterationLabel,
    },
  });

  await prisma.note.create({
    data: {
      fileId,
      userId,
      departmentId: userDepartmentId,
      message: `${newIterationLabel} yeniden başlatıldı: ${note}`,
    },
  });

  return updatedFile;
}

/**
 * Quality OK - proceed to Kolaj
 */
export async function qualityOk(
  fileId: string,
  userId: string,
  userDepartmentId: string,
  note?: string
) {
  const file = await prisma.file.findUnique({ where: { id: fileId } });

  if (!file) throw new Error('Dosya bulunamadı');
  if (file.status !== FileStatus.IN_QUALITY) throw new Error('Dosya uygun durumda değil');

  // Stop quality timer and work session
  await stopActiveTimerForFile(fileId);
  await stopWork(userId).catch(() => {});

  // Get Kolaj department
  const kolajDept = await prisma.department.findUnique({ where: { code: 'KOLAJ' } });
  if (!kolajDept) throw new Error('Kolaj departmanı bulunamadı');

  // Update file
  const updatedFile = await prisma.file.update({
    where: { id: fileId },
    data: {
      status: FileStatus.IN_KOLAJ,
      currentDepartmentId: kolajDept.id,
      pendingTakeover: true,
    },
  });

  await createAuditLog({
    fileId,
    actionType: 'QUALITY_OK',
    byUserId: userId,
    fromDepartmentId: userDepartmentId,
    toDepartmentId: kolajDept.id,
    payload: { note },
  });

  if (note) {
    await prisma.note.create({
      data: {
        fileId,
        userId,
        departmentId: userDepartmentId,
        message: `Kalite onayladı: ${note}`,
      },
    });
  }

  return updatedFile;
}

/**
 * Quality NOK - return to same designer
 */
export async function qualityNok(
  fileId: string,
  userId: string,
  userDepartmentId: string,
  note: string
) {
  const file = await prisma.file.findUnique({ where: { id: fileId } });

  if (!file) throw new Error('Dosya bulunamadı');
  if (file.status !== FileStatus.IN_QUALITY) throw new Error('Dosya uygun durumda değil');
  if (!file.assignedDesignerId) throw new Error('Dosyaya atanmış tasarımcı yok');

  // Stop quality timer and work session
  await stopActiveTimerForFile(fileId);
  await stopWork(userId).catch(() => {});

  // Get Repro department
  const reproDept = await prisma.department.findUnique({ where: { code: 'REPRO' } });
  if (!reproDept) throw new Error('Repro departmanı bulunamadı');

  // Update file - IMPORTANT: assignedDesignerId stays the same!
  const updatedFile = await prisma.file.update({
    where: { id: fileId },
    data: {
      status: FileStatus.REVISION_REQUIRED,
      currentDepartmentId: reproDept.id,
      pendingTakeover: true,
      skipQualityAfterCustomerOk: true,
      qualityNokReturn: true,
    },
  });

  await createAuditLog({
    fileId,
    actionType: 'QUALITY_NOK',
    byUserId: userId,
    fromDepartmentId: userDepartmentId,
    toDepartmentId: reproDept.id,
    payload: { note, returnToDesigner: file.assignedDesignerId },
  });

  // Mandatory note for NOK
  await prisma.note.create({
    data: {
      fileId,
      userId,
      departmentId: userDepartmentId,
      message: `Kalite reddetti: ${note}`,
    },
  });

  return updatedFile;
}

/**
 * Direct to Quality (no approval needed)
 */
export async function directToQuality(
  fileId: string,
  userId: string,
  note?: string
) {
  const file = await prisma.file.findUnique({ where: { id: fileId } });

  if (!file) throw new Error('Dosya bulunamadı');
  if (file.status !== FileStatus.IN_REPRO) throw new Error('Dosya uygun durumda değil');
  if (file.assignedDesignerId !== userId) throw new Error('Bu dosya size atanmamış');
  if (file.requiresApproval) throw new Error('Bu dosya onay gerektiriyor');

  // Stop current timer and work session
  await stopActiveTimerForFile(fileId);
  await stopWork(userId).catch(() => {});

  // Get Kalite department
  const kaliteDept = await prisma.department.findUnique({ where: { code: 'KALITE' } });
  if (!kaliteDept) throw new Error('Kalite departmanı bulunamadı');

  // Update file
  const updatedFile = await prisma.file.update({
    where: { id: fileId },
    data: {
      status: FileStatus.IN_QUALITY,
      currentDepartmentId: kaliteDept.id,
      pendingTakeover: true,
    },
  });

  await createAuditLog({
    fileId,
    actionType: 'TRANSFER',
    byUserId: userId,
    fromDepartmentId: file.currentDepartmentId,
    toDepartmentId: kaliteDept.id,
    payload: { action: 'DIRECT_TO_QUALITY', note },
  });

  if (note) {
    await prisma.note.create({
      data: {
        fileId,
        userId,
        departmentId: file.currentDepartmentId,
        message: note,
      },
    });
  }

  return updatedFile;
}

/**
 * Send to Production - terminal action
 */
export async function sendToProduction(
  fileId: string,
  userId: string,
  userDepartmentId: string,
  note?: string
) {
  const file = await prisma.file.findUnique({ where: { id: fileId } });

  if (!file) throw new Error('Dosya bulunamadı');
  if (file.status !== FileStatus.IN_KOLAJ) throw new Error('Dosya uygun durumda değil');

  // Stop kolaj timer and work session
  await stopActiveTimerForFile(fileId);
  await stopWork(userId).catch(() => {});

  // Update file - terminal state
  const updatedFile = await prisma.file.update({
    where: { id: fileId },
    data: {
      status: FileStatus.SENT_TO_PRODUCTION,
      closedAt: new Date(),
      currentLocationSlotId: null, // File left the system
    },
  });

  await createAuditLog({
    fileId,
    actionType: 'CLOSE',
    byUserId: userId,
    fromDepartmentId: userDepartmentId,
    payload: { note },
  });

  if (note) {
    await prisma.note.create({
      data: {
        fileId,
        userId,
        departmentId: userDepartmentId,
        message: `Üretime gönderildi: ${note}`,
      },
    });
  }

  return updatedFile;
}
