import { prisma } from '@/lib/db';
import { ActionType, Prisma } from '@prisma/client';

export interface CreateAuditLogInput {
  fileId: string;
  actionType: ActionType;
  byUserId: string;
  fromDepartmentId?: string | null;
  toDepartmentId?: string | null;
  payload?: Record<string, any> | null;
  ipAddress?: string | null;
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(input: CreateAuditLogInput) {
  return prisma.auditLog.create({
    data: {
      fileId: input.fileId,
      actionType: input.actionType,
      byUserId: input.byUserId,
      fromDepartmentId: input.fromDepartmentId ?? null,
      toDepartmentId: input.toDepartmentId ?? null,
      payload: input.payload ?? Prisma.JsonNull,
      ipAddress: input.ipAddress ?? null,
      timestamp: new Date(),
    },
  });
}

/**
 * Get audit logs for a file
 */
export async function getFileAuditLogs(fileId: string) {
  return prisma.auditLog.findMany({
    where: { fileId },
    include: {
      byUser: {
        select: {
          id: true,
          fullName: true,
          username: true,
        },
      },
      fromDepartment: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      toDepartment: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
    orderBy: { timestamp: 'desc' },
  });
}

/**
 * Get recent audit logs (admin view)
 */
export async function getRecentAuditLogs(options: {
  limit?: number;
  actionType?: ActionType;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  const where: Prisma.AuditLogWhereInput = {};

  if (options.actionType) {
    where.actionType = options.actionType;
  }
  if (options.userId) {
    where.byUserId = options.userId;
  }
  if (options.startDate || options.endDate) {
    where.timestamp = {};
    if (options.startDate) {
      where.timestamp.gte = options.startDate;
    }
    if (options.endDate) {
      where.timestamp.lte = options.endDate;
    }
  }

  return prisma.auditLog.findMany({
    where,
    include: {
      file: {
        select: {
          id: true,
          fileNo: true,
          customerName: true,
        },
      },
      byUser: {
        select: {
          id: true,
          fullName: true,
          username: true,
        },
      },
      fromDepartment: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      toDepartment: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
    orderBy: { timestamp: 'desc' },
    take: options.limit ?? 100,
  });
}
