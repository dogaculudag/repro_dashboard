import { describe, it, expect, vi, beforeEach } from 'vitest';
import { startTimeEntry, getActiveTimeEntry, stopTimeEntry } from './time-entry.service';

vi.mock('@/lib/db', () => ({
  prisma: {
    $transaction: vi.fn((fn: (tx: unknown) => Promise<unknown>) => fn(prismaTx)),
    timeEntry: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    file: {
      findUnique: vi.fn(),
    },
  },
}));

const prismaTx = {
  timeEntry: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  file: {
    findUnique: vi.fn(),
  },
};

const { prisma } = await import('@/lib/db');

describe('time-entry.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('startTimeEntry - single active rule', () => {
    it('throws when user already has an active TimeEntry', async () => {
      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
        async (fn: (tx: unknown) => Promise<unknown>) => {
          prismaTx.timeEntry.findFirst.mockResolvedValue({
            id: 'existing-id',
            userId: 'user-1',
            fileId: 'file-1',
            endAt: null,
          });
          prismaTx.file.findUnique.mockResolvedValue({
            id: 'file-2',
            currentDepartmentId: 'dept-1',
          });
          return fn(prismaTx);
        }
      );

      await expect(startTimeEntry('user-1', 'file-2')).rejects.toThrow(
        'Zaten aktif bir süre kaydınız var'
      );
      expect(prismaTx.timeEntry.create).not.toHaveBeenCalled();
    });

    it('creates TimeEntry when user has no active entry', async () => {
      const created = {
        id: 'new-id',
        userId: 'user-1',
        fileId: 'file-1',
        file: { id: 'file-1', fileNo: 'F1', customerName: 'C1' },
        department: { id: 'dept-1', name: 'D', code: 'D1' },
      };
      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
        async (fn: (tx: unknown) => Promise<unknown>) => {
          prismaTx.timeEntry.findFirst.mockResolvedValue(null);
          prismaTx.file.findUnique.mockResolvedValue({
            id: 'file-1',
            currentDepartmentId: 'dept-1',
          });
          prismaTx.timeEntry.create.mockResolvedValue(created);
          return fn(prismaTx);
        }
      );

      const result = await startTimeEntry('user-1', 'file-1');
      expect(result).toEqual(created);
      expect(prismaTx.timeEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            fileId: 'file-1',
            departmentId: 'dept-1',
          }),
        })
      );
    });
  });

  describe('getActiveTimeEntry', () => {
    it('returns null when no active entry', async () => {
      (prisma.timeEntry.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      const result = await getActiveTimeEntry('user-1');
      expect(result).toBeNull();
    });
  });

  describe('stopTimeEntry', () => {
    it('throws when no active TimeEntry', async () => {
      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
        async (fn: (tx: unknown) => Promise<unknown>) => {
          const tx = {
            timeEntry: {
              findFirst: vi.fn().mockResolvedValue(null),
              update: vi.fn(),
            },
          };
          return fn(tx);
        }
      );

      await expect(stopTimeEntry('user-1')).rejects.toThrow('Aktif süre kaydı bulunamadı');
    });
  });
});
