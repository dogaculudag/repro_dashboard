import { prisma } from '@/lib/db';
import { createAuditLog } from './audit.service';

/**
 * Get notes for a file
 */
export async function getFileNotes(fileId: string) {
  return prisma.note.findMany({
    where: { fileId },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          username: true,
        },
      },
      department: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Add a note to a file
 */
export async function addNote(
  fileId: string,
  userId: string,
  departmentId: string,
  message: string,
  isSystem: boolean = false
) {
  const note = await prisma.note.create({
    data: {
      fileId,
      userId,
      departmentId,
      message,
      isSystem,
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          username: true,
        },
      },
      department: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
  });

  // Log note addition
  await createAuditLog({
    fileId,
    actionType: 'NOTE_ADDED',
    byUserId: userId,
    payload: { noteId: note.id, message: message.substring(0, 100) },
  });

  return note;
}
