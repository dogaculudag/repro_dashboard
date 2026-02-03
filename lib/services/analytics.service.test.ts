import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getUsersAnalytics } from './analytics.service';

vi.mock('@/lib/db', () => ({
  prisma: {
    timeEntry: {
      findMany: vi.fn(),
    },
  },
}));

const { prisma } = await import('@/lib/db');

describe('analytics.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUsersAnalytics - weightedScore and productivity', () => {
    it('computes weightedScore as SUM(durationHours * difficultyWeight) and productivity', async () => {
      // User 1: 2h on file with weight 1.0 -> 2.0 weighted; 1h on file with weight 2.0 -> 2.0 weighted. Total 3h, weightedScore 4.0, productivity = 4/3 ≈ 1.33
      const from = new Date('2025-02-01T00:00:00Z');
      const to = new Date('2025-02-02T00:00:00Z');
      (prisma.timeEntry.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: 'e1',
          userId: 'user-1',
          user: { id: 'user-1', fullName: 'User One', username: 'u1' },
          fileId: 'file-1',
          durationSeconds: 7200, // 2h
          file: {
            id: 'file-1',
            difficultyWeight: 1.0,
            fileTypeId: 'ft1',
            fileType: { id: 'ft1', name: 'GENEL' },
          },
          department: { id: 'd1', name: 'Repro', code: 'REPRO' },
        },
        {
          id: 'e2',
          userId: 'user-1',
          user: { id: 'user-1', fullName: 'User One', username: 'u1' },
          fileId: 'file-2',
          durationSeconds: 3600, // 1h
          file: {
            id: 'file-2',
            difficultyWeight: 2.0,
            fileTypeId: 'ft1',
            fileType: { id: 'ft1', name: 'GENEL' },
          },
          department: { id: 'd1', name: 'Repro', code: 'REPRO' },
        },
      ]);

      const result = await getUsersAnalytics({ from, to });

      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe('user-1');
      expect(result[0].totalTimeSeconds).toBe(7200 + 3600); // 10800 = 3h
      expect(result[0].totalFilesWorked).toBe(2);
      // weightedScore = 2*1.0 + 1*2.0 = 4.0
      expect(result[0].weightedScore).toBe(4);
      // productivity = weightedScore / totalHours = 4 / 3 ≈ 1.33
      expect(result[0].productivity).toBe(1.33);
      expect(result[0].breakdownByFileType).toHaveLength(1);
      expect(result[0].breakdownByFileType[0].name).toBe('GENEL');
      expect(result[0].breakdownByFileType[0].totalTimeSeconds).toBe(10800);
      expect(result[0].breakdownByFileType[0].weightedScore).toBe(4);
      expect(result[0].breakdownByDepartment).toHaveLength(1);
      expect(result[0].breakdownByDepartment[0].totalTimeSeconds).toBe(10800);
    });

    it('returns empty array when no entries in range', async () => {
      const from = new Date('2025-02-01T00:00:00Z');
      const to = new Date('2025-02-02T00:00:00Z');
      (prisma.timeEntry.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await getUsersAnalytics({ from, to });

      expect(result).toHaveLength(0);
    });
  });
});
