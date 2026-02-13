import { describe, it, expect } from 'vitest';
import { prisma } from '@/lib/db';
import { Role, FileStatus, Stage } from '@prisma/client';
import type { File, User, Department } from '@prisma/client';
import {
  claimPreReproFile,
  completePreReproFile,
  returnPreReproToQueue,
} from './preRepro.service';

// Deterministic test helpers - seed minimal data per test
// Tests run with real Prisma against repro_test; setup truncates after each test.

async function createDepartment(code: string, name?: string): Promise<Department> {
  return prisma.department.create({
    data: {
      name: name ?? code,
      code,
      sortOrder: 0,
    },
  });
}

async function createUser(options: {
  username: string;
  role: Role;
  departmentId: string;
  fullName?: string;
}): Promise<User> {
  return prisma.user.create({
    data: {
      username: options.username,
      passwordHash: 'test-hash',
      fullName: options.fullName ?? options.username,
      role: options.role,
      departmentId: options.departmentId,
    },
  });
}

let fileNoCounter = 0;
function nextFileNo(): string {
  fileNoCounter += 1;
  return `REP-2026-${String(fileNoCounter).padStart(4, '0')}`;
}

async function createPreReproFile(options: {
  currentDepartmentId: string;
  status?: FileStatus;
  assignedDesignerId?: string | null;
  targetAssigneeId?: string | null;
}): Promise<File> {
  return prisma.file.create({
    data: {
      fileNo: nextFileNo(),
      customerName: 'Test Customer',
      currentDepartmentId: options.currentDepartmentId,
      status: options.status ?? FileStatus.AWAITING_ASSIGNMENT,
      stage: Stage.PRE_REPRO,
      assignedDesignerId: options.assignedDesignerId ?? null,
      targetAssigneeId: options.targetAssigneeId ?? null,
    },
  });
}

describe('preRepro.service', () => {
  describe('A. Claim', () => {
    it('Claim succeeds: sets assignedDesignerId to claimant, status unchanged, stage remains PRE_REPRO', async () => {
      const [onreproDept, reproDept] = await Promise.all([
        createDepartment('ONREPRO'),
        createDepartment('REPRO'),
      ]);
      const designer = await createUser({
        username: 'designer1',
        role: Role.ONREPRO,
        departmentId: onreproDept.id,
      });
      const file = await createPreReproFile({
        currentDepartmentId: onreproDept.id,
        status: FileStatus.AWAITING_ASSIGNMENT,
        assignedDesignerId: null,
      });

      const result = await claimPreReproFile({ fileId: file.id, userId: designer.id });

      expect(result.assignedDesignerId).toBe(designer.id);
      expect(result.stage).toBe(Stage.PRE_REPRO);
      expect(result.assignedDesigner?.id).toBe(designer.id);

      const updated = await prisma.file.findUnique({ where: { id: file.id } });
      expect(updated?.assignedDesignerId).toBe(designer.id);
      expect(updated?.stage).toBe(Stage.PRE_REPRO);
    });

    it('Claim fails if already claimed by another user', async () => {
      const onreproDept = await createDepartment('ONREPRO');
      const user1 = await createUser({
        username: 'user1',
        role: Role.ONREPRO,
        departmentId: onreproDept.id,
      });
      const user2 = await createUser({
        username: 'user2',
        role: Role.ONREPRO,
        departmentId: onreproDept.id,
      });
      const file = await createPreReproFile({
        currentDepartmentId: onreproDept.id,
        assignedDesignerId: user1.id,
      });

      await expect(claimPreReproFile({ fileId: file.id, userId: user2.id })).rejects.toThrow(
        'Dosya zaten başka biri tarafından devralınmış'
      );

      const unchanged = await prisma.file.findUnique({ where: { id: file.id } });
      expect(unchanged?.assignedDesignerId).toBe(user1.id);
    });

    it('Claim is idempotent for same user (claim twice does not change anything / no duplicate side effects)', async () => {
      const onreproDept = await createDepartment('ONREPRO');
      const designer = await createUser({
        username: 'designer1',
        role: Role.ONREPRO,
        departmentId: onreproDept.id,
      });
      const file = await createPreReproFile({
        currentDepartmentId: onreproDept.id,
        assignedDesignerId: null,
      });

      const first = await claimPreReproFile({ fileId: file.id, userId: designer.id });
      expect(first.assignedDesignerId).toBe(designer.id);

      // Second claim: atomic update where assignedDesignerId=null matches no rows (file is already claimed)
      // -> P2025, throws "Dosya zaten başka biri tarafından devralınmış"
      // No duplicate timers/audit created; file state unchanged
      await expect(claimPreReproFile({ fileId: file.id, userId: designer.id })).rejects.toThrow(
        'Dosya zaten başka biri tarafından devralınmış'
      );

      const final = await prisma.file.findUnique({ where: { id: file.id } });
      expect(final?.assignedDesignerId).toBe(designer.id);
      expect(final?.stage).toBe(Stage.PRE_REPRO);
    });
  });

  describe('B. Complete', () => {
    it('Complete succeeds: moves stage from PRE_REPRO to REPRO, updates currentDepartmentId to REPRO', async () => {
      const [onreproDept, reproDept] = await Promise.all([
        createDepartment('ONREPRO'),
        createDepartment('REPRO'),
      ]);
      const bahar = await createUser({
        username: 'bahar',
        role: Role.ADMIN,
        departmentId: onreproDept.id,
      });
      const designer = await createUser({
        username: 'designer1',
        role: Role.ONREPRO,
        departmentId: onreproDept.id,
      });
      const file = await createPreReproFile({
        currentDepartmentId: onreproDept.id,
        assignedDesignerId: designer.id,
      });

      const result = await completePreReproFile({ fileId: file.id, userId: designer.id });

      expect(result.stage).toBe(Stage.REPRO);
      expect(result.currentDepartmentId).toBe(reproDept.id);
      expect(result.status).toBe(FileStatus.ASSIGNED);
      expect(result.pendingTakeover).toBe(true);
      expect(result.assignedDesignerId).toBe(bahar.id); // No targetAssignee -> defaults to Bahar

      const updated = await prisma.file.findUnique({ where: { id: file.id } });
      expect(updated?.stage).toBe(Stage.REPRO);
      expect(updated?.currentDepartmentId).toBe(reproDept.id);
    });

    it('Complete fails if file is not claimed by the caller', async () => {
      const [onreproDept, reproDept] = await Promise.all([
        createDepartment('ONREPRO'),
        createDepartment('REPRO'),
      ]);
      const user1 = await createUser({
        username: 'user1',
        role: Role.ONREPRO,
        departmentId: onreproDept.id,
      });
      const user2 = await createUser({
        username: 'user2',
        role: Role.ONREPRO,
        departmentId: onreproDept.id,
      });
      const file = await createPreReproFile({
        currentDepartmentId: onreproDept.id,
        assignedDesignerId: user1.id,
      });

      await expect(completePreReproFile({ fileId: file.id, userId: user2.id })).rejects.toThrow(
        'Devretmek için önce bu dosyayı devralmış olmalısınız'
      );

      const unchanged = await prisma.file.findUnique({ where: { id: file.id } });
      expect(unchanged?.stage).toBe(Stage.PRE_REPRO);
    });

    it('Complete fails if file is not in PRE_REPRO stage', async () => {
      const [onreproDept, reproDept] = await Promise.all([
        createDepartment('ONREPRO'),
        createDepartment('REPRO'),
      ]);
      const designer = await createUser({
        username: 'designer1',
        role: Role.ONREPRO,
        departmentId: onreproDept.id,
      });
      const file = await prisma.file.create({
        data: {
          fileNo: nextFileNo(),
          customerName: 'Test',
          currentDepartmentId: reproDept.id,
          status: FileStatus.ASSIGNED,
          stage: Stage.REPRO,
          assignedDesignerId: designer.id,
        },
      });

      await expect(completePreReproFile({ fileId: file.id, userId: designer.id })).rejects.toThrow(
        'Dosya Ön Repro aşamasında değil'
      );

      const unchanged = await prisma.file.findUnique({ where: { id: file.id } });
      expect(unchanged?.stage).toBe(Stage.REPRO);
    });

    it('Complete idempotency: completing twice does not corrupt state (second attempt errors)', async () => {
      const [onreproDept, reproDept] = await Promise.all([
        createDepartment('ONREPRO'),
        createDepartment('REPRO'),
      ]);
      const bahar = await createUser({
        username: 'bahar',
        role: Role.ADMIN,
        departmentId: onreproDept.id,
      });
      const designer = await createUser({
        username: 'designer1',
        role: Role.ONREPRO,
        departmentId: onreproDept.id,
      });
      const file = await createPreReproFile({
        currentDepartmentId: onreproDept.id,
        assignedDesignerId: designer.id,
      });

      await completePreReproFile({ fileId: file.id, userId: designer.id });

      await expect(completePreReproFile({ fileId: file.id, userId: designer.id })).rejects.toThrow(
        'Dosya Ön Repro aşamasında değil'
      );

      const final = await prisma.file.findUnique({ where: { id: file.id } });
      expect(final?.stage).toBe(Stage.REPRO);
      expect(final?.currentDepartmentId).toBe(reproDept.id);
    });
  });

  describe('C. Return to Queue', () => {
    it('Return-to-queue succeeds: clears assignedDesignerId, remains in PRE_REPRO queue', async () => {
      const onreproDept = await createDepartment('ONREPRO');
      const designer = await createUser({
        username: 'designer1',
        role: Role.ONREPRO,
        departmentId: onreproDept.id,
      });
      const file = await createPreReproFile({
        currentDepartmentId: onreproDept.id,
        assignedDesignerId: designer.id,
      });

      const result = await returnPreReproToQueue({ fileId: file.id, userId: designer.id });

      expect(result.assignedDesignerId).toBeNull();
      expect(result.stage).toBe(Stage.PRE_REPRO);

      const updated = await prisma.file.findUnique({ where: { id: file.id } });
      expect(updated?.assignedDesignerId).toBeNull();
      expect(updated?.stage).toBe(Stage.PRE_REPRO);
    });

    it('Return-to-queue fails if caller is not the current assignee', async () => {
      const onreproDept = await createDepartment('ONREPRO');
      const user1 = await createUser({
        username: 'user1',
        role: Role.ONREPRO,
        departmentId: onreproDept.id,
      });
      const user2 = await createUser({
        username: 'user2',
        role: Role.ONREPRO,
        departmentId: onreproDept.id,
      });
      const file = await createPreReproFile({
        currentDepartmentId: onreproDept.id,
        assignedDesignerId: user1.id,
      });

      await expect(returnPreReproToQueue({ fileId: file.id, userId: user2.id })).rejects.toThrow(
        'Sadece dosyayı devralmış kişi geri kuyruğa atabilir'
      );

      const unchanged = await prisma.file.findUnique({ where: { id: file.id } });
      expect(unchanged?.assignedDesignerId).toBe(user1.id);
    });

    it('Return-to-queue for unclaimed file errors (caller is not assignee)', async () => {
      const onreproDept = await createDepartment('ONREPRO');
      const designer = await createUser({
        username: 'designer1',
        role: Role.ONREPRO,
        departmentId: onreproDept.id,
      });
      const file = await createPreReproFile({
        currentDepartmentId: onreproDept.id,
        assignedDesignerId: null,
      });

      await expect(returnPreReproToQueue({ fileId: file.id, userId: designer.id })).rejects.toThrow(
        'Sadece dosyayı devralmış kişi geri kuyruğa atabilir'
      );

      const unchanged = await prisma.file.findUnique({ where: { id: file.id } });
      expect(unchanged?.assignedDesignerId).toBeNull();
    });
  });

  describe('D. Concurrency safety', () => {
    it('Two users claiming same file: only one wins, the other gets controlled error', async () => {
      const onreproDept = await createDepartment('ONREPRO');
      const user1 = await createUser({
        username: 'user1',
        role: Role.ONREPRO,
        departmentId: onreproDept.id,
      });
      const user2 = await createUser({
        username: 'user2',
        role: Role.ONREPRO,
        departmentId: onreproDept.id,
      });
      const file = await createPreReproFile({
        currentDepartmentId: onreproDept.id,
        assignedDesignerId: null,
      });

      const results = await Promise.allSettled([
        claimPreReproFile({ fileId: file.id, userId: user1.id }),
        claimPreReproFile({ fileId: file.id, userId: user2.id }),
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);

      const winner = fulfilled[0].status === 'fulfilled' ? fulfilled[0].value : null;
      expect(winner).toBeDefined();
      const winnerId = (winner as { assignedDesignerId: string }).assignedDesignerId;
      expect([user1.id, user2.id]).toContain(winnerId);

      const loser = rejected[0].status === 'rejected' ? rejected[0].reason : null;
      expect(loser).toBeInstanceOf(Error);
      expect((loser as Error).message).toBe('Dosya zaten başka biri tarafından devralınmış');

      const final = await prisma.file.findUnique({ where: { id: file.id } });
      expect(final?.assignedDesignerId).toBe(winnerId);
    });
  });

  describe('E. Not found / validation', () => {
    it('Claim fails for non-existent file', async () => {
      const onreproDept = await createDepartment('ONREPRO');
      const designer = await createUser({
        username: 'designer1',
        role: Role.ONREPRO,
        departmentId: onreproDept.id,
      });

      await expect(
        claimPreReproFile({ fileId: 'non-existent-uuid', userId: designer.id })
      ).rejects.toThrow('Dosya bulunamadı');
    });

    it('Return-to-queue fails for non-existent file', async () => {
      const onreproDept = await createDepartment('ONREPRO');
      const designer = await createUser({
        username: 'designer1',
        role: Role.ONREPRO,
        departmentId: onreproDept.id,
      });

      await expect(
        returnPreReproToQueue({ fileId: 'non-existent-uuid', userId: designer.id })
      ).rejects.toThrow('Dosya bulunamadı');
    });
  });
});
