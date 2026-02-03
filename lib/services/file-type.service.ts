import { prisma } from '@/lib/db';
import type { CreateFileTypeInput, UpdateFileTypeInput } from '@/lib/validations';

export async function getAllFileTypes() {
  return prisma.fileType.findMany({
    orderBy: { name: 'asc' },
  });
}

export async function getFileTypeById(id: string) {
  return prisma.fileType.findUnique({
    where: { id },
    include: { _count: { select: { files: true } } },
  });
}

export async function createFileType(input: CreateFileTypeInput) {
  return prisma.fileType.create({
    data: {
      name: input.name.trim(),
      description: input.description?.trim() ?? undefined,
      defaultDifficultyLevel: input.defaultDifficultyLevel ?? undefined,
      defaultDifficultyWeight: input.defaultDifficultyWeight ?? undefined,
    },
  });
}

export async function updateFileType(id: string, input: UpdateFileTypeInput) {
  return prisma.fileType.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.description !== undefined && { description: input.description?.trim() ?? null }),
      ...(input.defaultDifficultyLevel !== undefined && { defaultDifficultyLevel: input.defaultDifficultyLevel }),
      ...(input.defaultDifficultyWeight !== undefined && { defaultDifficultyWeight: input.defaultDifficultyWeight }),
    },
  });
}

export async function deleteFileType(id: string, fallbackFileTypeId?: string) {
  const fileType = await prisma.fileType.findUnique({
    where: { id },
    include: { _count: { select: { files: true } } },
  });
  if (!fileType) throw new Error('Dosya tipi bulunamadı');
  if (fileType._count.files > 0) {
    if (!fallbackFileTypeId) {
      throw new Error('Bu dosya tipine bağlı dosyalar var. Silmek için önce dosyaları başka bir tipe taşıyın veya fallback tipi belirtin.');
    }
    await prisma.file.updateMany({
      where: { fileTypeId: id },
      data: { fileTypeId: fallbackFileTypeId },
    });
  }
  return prisma.fileType.delete({
    where: { id },
  });
}
