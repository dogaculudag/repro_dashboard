# Test Plan
# Repro Department File Tracking System

**Version:** 1.0  
**Date:** February 2, 2026

---

## 1. Test Strategy Overview

### 1.1 Testing Pyramid

```
                 ┌─────────────────┐
                 │      E2E        │  5-10 critical flows
                 │   (Playwright)  │
                 └────────┬────────┘
                          │
              ┌───────────┴───────────┐
              │    Integration        │  20-30 API tests
              │    (Vitest + DB)      │
              └───────────┬───────────┘
                          │
         ┌────────────────┴────────────────┐
         │           Unit Tests            │  50+ function tests
         │         (Vitest)                │
         └─────────────────────────────────┘
```

### 1.2 Testing Tools

| Type | Tool | Purpose |
|------|------|---------|
| Unit | Vitest | Fast unit tests for services, utilities |
| Integration | Vitest + Prisma | API route testing with real database |
| E2E | Playwright | Browser-based user flow testing |
| Mocking | vitest-mock-extended | Database and service mocks |
| Coverage | c8 (via Vitest) | Code coverage reporting |

### 1.3 Coverage Goals

| Layer | Target Coverage |
|-------|-----------------|
| Services (lib/services/*) | 80% |
| Utilities (lib/utils/*) | 90% |
| API Routes | 70% |
| Components | 60% |
| Overall | 75% |

---

## 2. Test Environment Setup

### 2.1 Test Database Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'c8',
      reporter: ['text', 'html', 'lcov'],
      exclude: ['node_modules', 'tests', '*.config.*'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
```

### 2.2 Test Setup File

```typescript
// tests/setup.ts
import { beforeAll, afterAll, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

const prisma = new PrismaClient();

beforeAll(async () => {
  // Use test database
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  
  // Run migrations
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
});

afterEach(async () => {
  // Clean up test data after each test
  const tablenames = await prisma.$queryRaw<
    Array<{ tablename: string }>
  >`SELECT tablename FROM pg_tables WHERE schemaname='public'`;
  
  for (const { tablename } of tablenames) {
    if (tablename !== '_prisma_migrations') {
      await prisma.$executeRawUnsafe(
        `TRUNCATE TABLE "public"."${tablename}" CASCADE;`
      );
    }
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

export { prisma };
```

### 2.3 Test Utilities

```typescript
// tests/utils/factories.ts
import { prisma } from '../setup';
import bcrypt from 'bcrypt';
import { Role, FileStatus, Priority, LocationArea } from '@prisma/client';

export async function createTestUser(overrides = {}) {
  const passwordHash = await bcrypt.hash('password123', 10);
  const dept = await prisma.department.findFirst({ where: { code: 'REPRO' } });
  
  return prisma.user.create({
    data: {
      username: `user_${Date.now()}`,
      passwordHash,
      fullName: 'Test User',
      role: Role.GRAFIKER,
      departmentId: dept!.id,
      ...overrides,
    },
  });
}

export async function createTestFile(overrides = {}) {
  const dept = await prisma.department.findFirst({ where: { code: 'ONREPRO' } });
  const location = await prisma.locationSlot.findFirst();
  
  return prisma.file.create({
    data: {
      fileNo: `TEST-${Date.now()}`,
      customerName: 'Test Customer',
      status: FileStatus.AWAITING_ASSIGNMENT,
      currentDepartmentId: dept!.id,
      currentLocationSlotId: location?.id,
      ...overrides,
    },
  });
}

export async function createTestDepartments() {
  return Promise.all([
    prisma.department.create({ data: { name: 'Yönetim', code: 'ADMIN' } }),
    prisma.department.create({ data: { name: 'Ön Repro', code: 'ONREPRO' } }),
    prisma.department.create({ data: { name: 'Repro', code: 'REPRO' } }),
    prisma.department.create({ data: { name: 'Kalite', code: 'KALITE' } }),
    prisma.department.create({ data: { name: 'Kolaj', code: 'KOLAJ' } }),
    prisma.department.create({ data: { name: 'Müşteri', code: 'CUSTOMER', isVirtual: true } }),
  ]);
}

export async function createTestLocations() {
  const locations = [];
  for (let i = 1; i <= 5; i++) {
    locations.push({
      code: `A${i}`,
      name: `Waiting ${i}`,
      area: LocationArea.WAITING,
      row: 1,
      column: i,
    });
  }
  return prisma.locationSlot.createMany({ data: locations });
}
```

---

## 3. Unit Tests

### 3.1 Timer Service Tests

```typescript
// tests/unit/services/timer.service.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TimerService } from '@/lib/services/timer.service';
import { prismaMock } from '../../mocks/prisma';

describe('TimerService', () => {
  let timerService: TimerService;

  beforeEach(() => {
    timerService = new TimerService(prismaMock);
  });

  describe('startTimer', () => {
    it('should create a new timer with start time', async () => {
      const mockTimer = {
        id: 'timer-1',
        fileId: 'file-1',
        departmentId: 'dept-1',
        userId: 'user-1',
        startTime: new Date(),
        endTime: null,
        durationSeconds: null,
      };

      prismaMock.timer.findFirst.mockResolvedValue(null); // No active timer
      prismaMock.timer.create.mockResolvedValue(mockTimer);

      const result = await timerService.startTimer('file-1', 'dept-1', 'user-1');

      expect(result).toEqual(mockTimer);
      expect(prismaMock.timer.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          fileId: 'file-1',
          departmentId: 'dept-1',
          userId: 'user-1',
        }),
      });
    });

    it('should throw error if file already has active timer', async () => {
      prismaMock.timer.findFirst.mockResolvedValue({
        id: 'existing-timer',
        endTime: null,
      } as any);

      await expect(
        timerService.startTimer('file-1', 'dept-1', 'user-1')
      ).rejects.toThrow('File already has an active timer');
    });

    it('should allow null userId for virtual department', async () => {
      prismaMock.timer.findFirst.mockResolvedValue(null);
      prismaMock.timer.create.mockResolvedValue({
        id: 'timer-1',
        userId: null,
      } as any);

      const result = await timerService.startTimer('file-1', 'customer-dept', null);

      expect(result.userId).toBeNull();
    });
  });

  describe('stopTimer', () => {
    it('should set end time and calculate duration', async () => {
      const startTime = new Date(Date.now() - 3600000); // 1 hour ago
      const mockTimer = {
        id: 'timer-1',
        startTime,
        endTime: null,
      };

      prismaMock.timer.findUnique.mockResolvedValue(mockTimer as any);
      prismaMock.timer.update.mockImplementation(({ data }) => ({
        ...mockTimer,
        ...data,
      }));

      const result = await timerService.stopTimer('timer-1');

      expect(result.endTime).toBeDefined();
      expect(result.durationSeconds).toBeGreaterThanOrEqual(3599);
      expect(result.durationSeconds).toBeLessThanOrEqual(3601);
    });

    it('should throw error if timer already stopped', async () => {
      prismaMock.timer.findUnique.mockResolvedValue({
        id: 'timer-1',
        endTime: new Date(), // Already stopped
      } as any);

      await expect(timerService.stopTimer('timer-1')).rejects.toThrow(
        'Timer already stopped'
      );
    });
  });

  describe('calculateDuration', () => {
    it('should calculate duration in seconds', () => {
      const start = new Date('2026-02-01T10:00:00Z');
      const end = new Date('2026-02-01T12:30:00Z');

      const duration = timerService.calculateDuration(start, end);

      expect(duration).toBe(9000); // 2.5 hours in seconds
    });
  });
});
```

### 3.2 Workflow Service Tests

```typescript
// tests/unit/services/workflow.service.test.ts
import { describe, it, expect } from 'vitest';
import { WorkflowService } from '@/lib/services/workflow.service';
import { FileStatus, Role } from '@prisma/client';

describe('WorkflowService', () => {
  const workflowService = new WorkflowService();

  describe('validateTransition', () => {
    it('should allow AWAITING_ASSIGNMENT to ASSIGNED', () => {
      const result = workflowService.validateTransition(
        FileStatus.AWAITING_ASSIGNMENT,
        FileStatus.ASSIGNED
      );
      expect(result.valid).toBe(true);
    });

    it('should not allow AWAITING_ASSIGNMENT to IN_QUALITY', () => {
      const result = workflowService.validateTransition(
        FileStatus.AWAITING_ASSIGNMENT,
        FileStatus.IN_QUALITY
      );
      expect(result.valid).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('should allow CUSTOMER_APPROVAL to IN_QUALITY (OK)', () => {
      const result = workflowService.validateTransition(
        FileStatus.CUSTOMER_APPROVAL,
        FileStatus.IN_QUALITY
      );
      expect(result.valid).toBe(true);
    });

    it('should allow CUSTOMER_APPROVAL to REVISION_REQUIRED (NOK)', () => {
      const result = workflowService.validateTransition(
        FileStatus.CUSTOMER_APPROVAL,
        FileStatus.REVISION_REQUIRED
      );
      expect(result.valid).toBe(true);
    });

    it('should not allow any transition from SENT_TO_PRODUCTION', () => {
      const result = workflowService.validateTransition(
        FileStatus.SENT_TO_PRODUCTION,
        FileStatus.IN_REPRO
      );
      expect(result.valid).toBe(false);
    });
  });

  describe('getAvailableActions', () => {
    it('should return assign action for ADMIN on AWAITING_ASSIGNMENT', () => {
      const file = {
        status: FileStatus.AWAITING_ASSIGNMENT,
        assignedDesignerId: null,
      };
      const user = { role: Role.ADMIN, id: 'admin-1' };

      const actions = workflowService.getAvailableActions(file as any, user as any);

      expect(actions).toContain('ASSIGN');
      expect(actions).not.toContain('TAKEOVER');
    });

    it('should return takeover for assigned designer on ASSIGNED', () => {
      const file = {
        status: FileStatus.ASSIGNED,
        assignedDesignerId: 'user-1',
        pendingTakeover: true,
      };
      const user = { role: Role.GRAFIKER, id: 'user-1' };

      const actions = workflowService.getAvailableActions(file as any, user as any);

      expect(actions).toContain('TAKEOVER');
    });

    it('should not return takeover for different designer', () => {
      const file = {
        status: FileStatus.ASSIGNED,
        assignedDesignerId: 'user-1',
        pendingTakeover: true,
      };
      const user = { role: Role.GRAFIKER, id: 'user-2' };

      const actions = workflowService.getAvailableActions(file as any, user as any);

      expect(actions).not.toContain('TAKEOVER');
    });

    it('should return quality actions for KALITE role', () => {
      const file = {
        status: FileStatus.IN_QUALITY,
        currentDepartmentId: 'kalite-dept',
      };
      const user = {
        role: Role.KALITE,
        departmentId: 'kalite-dept',
        hasActiveTimer: true,
      };

      const actions = workflowService.getAvailableActions(file as any, user as any);

      expect(actions).toContain('QUALITY_OK');
      expect(actions).toContain('QUALITY_NOK');
    });
  });
});
```

### 3.3 RBAC Tests

```typescript
// tests/unit/auth/rbac.test.ts
import { describe, it, expect } from 'vitest';
import { hasPermission, canPerformAction } from '@/lib/auth/rbac';
import { Role } from '@prisma/client';

describe('RBAC', () => {
  describe('hasPermission', () => {
    it('ADMIN should have all permissions', () => {
      expect(hasPermission(Role.ADMIN, 'file:assign')).toBe(true);
      expect(hasPermission(Role.ADMIN, 'user:manage')).toBe(true);
      expect(hasPermission(Role.ADMIN, 'report:view')).toBe(true);
    });

    it('GRAFIKER should not have assign permission', () => {
      expect(hasPermission(Role.GRAFIKER, 'file:assign')).toBe(false);
    });

    it('GRAFIKER should have takeover permission', () => {
      expect(hasPermission(Role.GRAFIKER, 'file:takeover')).toBe(true);
    });

    it('ONREPRO should have file:create permission', () => {
      expect(hasPermission(Role.ONREPRO, 'file:create')).toBe(true);
    });

    it('KALITE should have quality:approve permission', () => {
      expect(hasPermission(Role.KALITE, 'quality:approve')).toBe(true);
    });

    it('KOLAJ should have production:send permission', () => {
      expect(hasPermission(Role.KOLAJ, 'production:send')).toBe(true);
    });
  });
});
```

### 3.4 Date Utility Tests

```typescript
// tests/unit/utils/date.test.ts
import { describe, it, expect } from 'vitest';
import {
  formatDisplayDate,
  formatDisplayTime,
  formatDuration,
  calculateElapsedSeconds,
} from '@/lib/utils/date';

describe('Date Utilities', () => {
  describe('formatDisplayDate', () => {
    it('should format date in Turkish locale', () => {
      const date = new Date('2026-02-01T15:30:00Z');
      const result = formatDisplayDate(date);
      
      // Europe/Istanbul is UTC+3
      expect(result).toMatch(/01\.02\.2026/);
      expect(result).toMatch(/18:30/);
    });
  });

  describe('formatDuration', () => {
    it('should format seconds only', () => {
      expect(formatDuration(45)).toBe('45sn');
    });

    it('should format minutes and seconds', () => {
      expect(formatDuration(125)).toBe('2d 5sn');
    });

    it('should format hours, minutes, seconds', () => {
      expect(formatDuration(3725)).toBe('1s 2d 5sn');
    });

    it('should handle zero', () => {
      expect(formatDuration(0)).toBe('0sn');
    });
  });

  describe('calculateElapsedSeconds', () => {
    it('should calculate elapsed time from start', () => {
      const start = new Date(Date.now() - 60000); // 1 minute ago
      const elapsed = calculateElapsedSeconds(start);
      
      expect(elapsed).toBeGreaterThanOrEqual(59);
      expect(elapsed).toBeLessThanOrEqual(61);
    });
  });
});
```

---

## 4. Integration Tests

### 4.1 File API Tests

```typescript
// tests/integration/api/files.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../../setup';
import { createTestUser, createTestFile, createTestDepartments, createTestLocations } from '../../utils/factories';
import { FileStatus, Role } from '@prisma/client';

// Mock Next.js request/response
import { createMocks } from 'node-mocks-http';
import { GET, POST } from '@/app/api/files/route';

describe('Files API', () => {
  beforeEach(async () => {
    await createTestDepartments();
    await createTestLocations();
  });

  describe('GET /api/files', () => {
    it('should return paginated files', async () => {
      await createTestFile({ fileNo: 'TEST-001' });
      await createTestFile({ fileNo: 'TEST-002' });
      await createTestFile({ fileNo: 'TEST-003' });

      const { req, res } = createMocks({
        method: 'GET',
        query: { page: '1', limit: '2' },
      });

      const response = await GET(req as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.length).toBe(2);
      expect(data.meta.pagination.total).toBe(3);
    });

    it('should filter by status', async () => {
      await createTestFile({ fileNo: 'TEST-001', status: FileStatus.AWAITING_ASSIGNMENT });
      await createTestFile({ fileNo: 'TEST-002', status: FileStatus.IN_REPRO });

      const { req } = createMocks({
        method: 'GET',
        query: { status: 'AWAITING_ASSIGNMENT' },
      });

      const response = await GET(req as any);
      const data = await response.json();

      expect(data.data.length).toBe(1);
      expect(data.data[0].status).toBe('AWAITING_ASSIGNMENT');
    });

    it('should search by file number', async () => {
      await createTestFile({ fileNo: 'REP-2026-0001' });
      await createTestFile({ fileNo: 'REP-2026-0002' });

      const { req } = createMocks({
        method: 'GET',
        query: { search: '0001' },
      });

      const response = await GET(req as any);
      const data = await response.json();

      expect(data.data.length).toBe(1);
      expect(data.data[0].fileNo).toBe('REP-2026-0001');
    });
  });

  describe('POST /api/files', () => {
    it('should create a new file', async () => {
      const user = await createTestUser({ role: Role.ONREPRO });
      const location = await prisma.locationSlot.findFirst();

      const { req } = createMocks({
        method: 'POST',
        body: {
          fileNo: 'NEW-2026-0001',
          customerName: 'New Customer',
          locationSlotId: location!.id,
        },
      });

      // Mock session
      vi.mock('@/lib/auth/auth', () => ({
        getServerSession: () => ({ user: { id: user.id, role: 'ONREPRO' } }),
      }));

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.fileNo).toBe('NEW-2026-0001');
      expect(data.data.status).toBe('AWAITING_ASSIGNMENT');
    });

    it('should reject duplicate file number', async () => {
      await createTestFile({ fileNo: 'EXISTING-001' });
      const location = await prisma.locationSlot.findFirst();

      const { req } = createMocks({
        method: 'POST',
        body: {
          fileNo: 'EXISTING-001',
          customerName: 'Customer',
          locationSlotId: location!.id,
        },
      });

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
```

### 4.2 Takeover API Tests

```typescript
// tests/integration/api/takeover.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../../setup';
import { createTestUser, createTestFile, createTestDepartments } from '../../utils/factories';
import { FileStatus, Role } from '@prisma/client';

describe('Takeover API', () => {
  let grafiker: any;
  let reproDept: any;

  beforeEach(async () => {
    const depts = await createTestDepartments();
    reproDept = depts.find(d => d.code === 'REPRO');
    grafiker = await createTestUser({
      role: Role.GRAFIKER,
      departmentId: reproDept.id,
    });
  });

  describe('POST /api/files/:id/takeover', () => {
    it('should start timer when designer takes over assigned file', async () => {
      const file = await createTestFile({
        status: FileStatus.ASSIGNED,
        assignedDesignerId: grafiker.id,
        currentDepartmentId: reproDept.id,
        pendingTakeover: true,
      });

      // Call takeover API
      const response = await callTakeoverAPI(file.id, grafiker.id);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.status).toBe('IN_REPRO');
      expect(data.data.pendingTakeover).toBe(false);

      // Verify timer was created
      const timer = await prisma.timer.findFirst({
        where: { fileId: file.id, endTime: null },
      });
      expect(timer).toBeDefined();
      expect(timer?.userId).toBe(grafiker.id);
    });

    it('should reject takeover by non-assigned user', async () => {
      const otherUser = await createTestUser({
        role: Role.GRAFIKER,
        departmentId: reproDept.id,
      });

      const file = await createTestFile({
        status: FileStatus.ASSIGNED,
        assignedDesignerId: grafiker.id,
        currentDepartmentId: reproDept.id,
      });

      const response = await callTakeoverAPI(file.id, otherUser.id);

      expect(response.status).toBe(403);
    });

    it('should stop previous timer when new takeover happens', async () => {
      const onreproDept = await prisma.department.findFirst({ where: { code: 'ONREPRO' } });
      
      // Create file with existing timer
      const file = await createTestFile({
        status: FileStatus.ASSIGNED,
        assignedDesignerId: grafiker.id,
        currentDepartmentId: reproDept.id,
        pendingTakeover: true,
      });

      // Create old timer
      const oldTimer = await prisma.timer.create({
        data: {
          fileId: file.id,
          departmentId: onreproDept!.id,
          userId: null,
          startTime: new Date(Date.now() - 3600000),
        },
      });

      // Takeover
      await callTakeoverAPI(file.id, grafiker.id);

      // Verify old timer stopped
      const updatedOldTimer = await prisma.timer.findUnique({
        where: { id: oldTimer.id },
      });
      expect(updatedOldTimer?.endTime).toBeDefined();
      expect(updatedOldTimer?.durationSeconds).toBeGreaterThan(0);
    });
  });
});
```

### 4.3 Workflow Integration Tests

```typescript
// tests/integration/workflow/r100.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../../setup';
import { FileStatus, Role } from '@prisma/client';

describe('R100 Approval Workflow', () => {
  let manager: any, onrepro: any, grafiker: any;
  let onreproDept: any, reproDept: any, customerDept: any, kaliteDept: any;

  beforeEach(async () => {
    // Setup departments and users
    // ...
  });

  it('should complete full approval flow: design → approval → customer OK → quality', async () => {
    // 1. Create file
    const file = await createTestFile({
      status: FileStatus.AWAITING_ASSIGNMENT,
      requiresApproval: true,
    });

    // 2. Manager assigns
    await callAssignAPI(file.id, grafiker.id, manager.id);
    let updatedFile = await prisma.file.findUnique({ where: { id: file.id } });
    expect(updatedFile?.status).toBe('ASSIGNED');
    expect(updatedFile?.assignedDesignerId).toBe(grafiker.id);

    // 3. Designer takes over
    await callTakeoverAPI(file.id, grafiker.id);
    updatedFile = await prisma.file.findUnique({ where: { id: file.id } });
    expect(updatedFile?.status).toBe('IN_REPRO');

    // 4. Designer requests approval
    await callRequestApprovalAPI(file.id, grafiker.id);
    updatedFile = await prisma.file.findUnique({ where: { id: file.id } });
    expect(updatedFile?.status).toBe('APPROVAL_PREP');

    // 5. Önrepro sends to customer
    await callSendToCustomerAPI(file.id, onrepro.id);
    updatedFile = await prisma.file.findUnique({ where: { id: file.id } });
    expect(updatedFile?.status).toBe('CUSTOMER_APPROVAL');

    // Verify customer timer started
    const customerTimer = await prisma.timer.findFirst({
      where: {
        fileId: file.id,
        departmentId: customerDept.id,
        endTime: null,
      },
    });
    expect(customerTimer).toBeDefined();
    expect(customerTimer?.userId).toBeNull(); // Virtual department

    // 6. Customer OK
    await callCustomerOkAPI(file.id, onrepro.id);
    updatedFile = await prisma.file.findUnique({ where: { id: file.id } });
    expect(updatedFile?.status).toBe('IN_QUALITY');
    expect(updatedFile?.pendingTakeover).toBe(true);

    // Verify customer timer stopped
    const stoppedTimer = await prisma.timer.findUnique({
      where: { id: customerTimer!.id },
    });
    expect(stoppedTimer?.endTime).toBeDefined();
  });

  it('should return to same designer on customer NOK', async () => {
    const file = await createTestFile({
      status: FileStatus.CUSTOMER_APPROVAL,
      assignedDesignerId: grafiker.id,
      currentDepartmentId: customerDept.id,
    });

    await callCustomerNokAPI(file.id, onrepro.id, 'Colors need adjustment');

    const updatedFile = await prisma.file.findUnique({ where: { id: file.id } });
    expect(updatedFile?.status).toBe('REVISION_REQUIRED');
    expect(updatedFile?.assignedDesignerId).toBe(grafiker.id); // Same designer!

    // Verify note was created
    const notes = await prisma.note.findMany({ where: { fileId: file.id } });
    expect(notes.some(n => n.message.includes('Colors need adjustment'))).toBe(true);
  });

  it('should increment iteration on MG restart', async () => {
    const file = await createTestFile({
      status: FileStatus.CUSTOMER_APPROVAL,
      assignedDesignerId: grafiker.id,
      iterationNumber: 1,
      iterationLabel: 'MG1',
    });

    await callRestartMgAPI(file.id, onrepro.id, 'Customer sent new data');

    const updatedFile = await prisma.file.findUnique({ where: { id: file.id } });
    expect(updatedFile?.status).toBe('APPROVAL_PREP');
    expect(updatedFile?.iterationNumber).toBe(2);
    expect(updatedFile?.iterationLabel).toBe('MG2');
    expect(updatedFile?.assignedDesignerId).toBe(grafiker.id); // Same designer!
  });
});
```

---

## 5. E2E Tests (Playwright)

### 5.1 Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### 5.2 Login Flow Test

```typescript
// tests/e2e/auth/login.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Login', () => {
  test('should login as manager', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="username"]', 'bahar');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('text=Hoş Geldiniz')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="username"]', 'wrong');
    await page.fill('input[name="password"]', 'wrong');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=Geçersiz kullanıcı adı veya şifre')).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[name="username"]', 'bahar');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Logout
    await page.click('[data-testid="user-menu"]');
    await page.click('text=Çıkış Yap');

    await expect(page).toHaveURL('/login');
  });
});
```

### 5.3 File Creation Flow Test

```typescript
// tests/e2e/files/create.spec.ts
import { test, expect } from '@playwright/test';

test.describe('File Creation', () => {
  test.beforeEach(async ({ page }) => {
    // Login as Önrepro
    await page.goto('/login');
    await page.fill('input[name="username"]', 'onrepro1');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
  });

  test('should create a new file', async ({ page }) => {
    await page.goto('/files/new');

    // Fill form
    await page.fill('input[name="fileNo"]', 'E2E-TEST-001');
    await page.fill('input[name="customerName"]', 'E2E Test Customer');
    await page.fill('input[name="customerNo"]', 'CUST-E2E');

    // Select location
    await page.click('[data-testid="location-select"]');
    await page.click('text=A1 - Bekleme Alanı 1');

    // Submit
    await page.click('button[type="submit"]');

    // Verify success
    await expect(page.locator('text=Dosya başarıyla oluşturuldu')).toBeVisible();
    
    // Should redirect to file detail
    await expect(page).toHaveURL(/\/files\/[a-f0-9-]+/);
    await expect(page.locator('text=E2E-TEST-001')).toBeVisible();
    await expect(page.locator('text=Atama Bekliyor')).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto('/files/new');

    // Try to submit empty form
    await page.click('button[type="submit"]');

    // Check validation errors
    await expect(page.locator('text=Dosya no zorunludur')).toBeVisible();
    await expect(page.locator('text=Müşteri adı zorunludur')).toBeVisible();
  });
});
```

### 5.4 Assignment Flow Test

```typescript
// tests/e2e/workflow/assignment.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Assignment Workflow', () => {
  test('manager should assign file to designer', async ({ page }) => {
    // Login as manager
    await page.goto('/login');
    await page.fill('input[name="username"]', 'bahar');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Go to assignment pool
    await page.click('text=Atama Havuzu');
    
    // Find unassigned file and select
    await page.click('[data-testid="file-checkbox-0"]');
    
    // Click assign button
    await page.click('text=Seçilenleri Ata');

    // Select designer in modal
    await page.click('[data-testid="designer-select"]');
    await page.click('text=Ali Demir');

    // Confirm assignment
    await page.click('button:has-text("Ata")');

    // Verify success
    await expect(page.locator('text=Dosya başarıyla atandı')).toBeVisible();
    
    // File should disappear from pool
    await expect(page.locator('[data-testid="file-checkbox-0"]')).not.toBeVisible();
  });
});
```

### 5.5 Complete Workflow E2E Test

```typescript
// tests/e2e/workflow/complete-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Complete Workflow', () => {
  test('file should go through entire R100/R200 workflow', async ({ page }) => {
    // This is a long E2E test that covers the entire flow
    // 1. Önrepro creates file
    // 2. Manager assigns to designer
    // 3. Designer takes over and works
    // 4. Designer requests approval
    // 5. Önrepro sends to customer
    // 6. Customer OK recorded
    // 7. Quality takes over
    // 8. Quality OK
    // 9. Kolaj takes over
    // 10. Sent to production

    // ... (implement each step with proper assertions)

    // Final assertion
    await expect(page.locator('text=Üretime Gönderildi')).toBeVisible();
  });
});
```

---

## 6. Seed Data Strategy

### 6.1 Test Data Scenarios

| Scenario | Files | State | Purpose |
|----------|-------|-------|---------|
| Empty DB | 0 | - | Fresh install testing |
| Light | 5-10 | Various statuses | Basic functionality testing |
| Medium | 50 | Distributed states | Performance, pagination testing |
| Heavy | 500+ | Realistic distribution | Load testing, performance benchmarks |

### 6.2 Seed Data Distribution

```typescript
// prisma/seed/scenarios.ts

export const LIGHT_SCENARIO = {
  files: [
    { status: 'AWAITING_ASSIGNMENT', count: 3 },
    { status: 'IN_REPRO', count: 2 },
    { status: 'CUSTOMER_APPROVAL', count: 1 },
    { status: 'IN_QUALITY', count: 1 },
    { status: 'IN_KOLAJ', count: 1 },
    { status: 'SENT_TO_PRODUCTION', count: 2 },
  ],
};

export const MEDIUM_SCENARIO = {
  files: [
    { status: 'AWAITING_ASSIGNMENT', count: 10 },
    { status: 'ASSIGNED', count: 5 },
    { status: 'IN_REPRO', count: 15 },
    { status: 'APPROVAL_PREP', count: 3 },
    { status: 'CUSTOMER_APPROVAL', count: 5 },
    { status: 'REVISION_REQUIRED', count: 2 },
    { status: 'IN_QUALITY', count: 5 },
    { status: 'IN_KOLAJ', count: 3 },
    { status: 'SENT_TO_PRODUCTION', count: 52 },
  ],
};
```

### 6.3 Realistic Timer Data

```typescript
// Generate realistic timer durations
function generateRealisticTimers(file: any, status: FileStatus) {
  const timers = [];
  
  // Always has Önrepro time
  timers.push({
    departmentId: onreproDeptId,
    startTime: file.createdAt,
    endTime: addHours(file.createdAt, randomBetween(2, 8)),
    durationSeconds: randomBetween(7200, 28800),
  });

  if (status !== 'AWAITING_ASSIGNMENT') {
    // Has Repro time
    timers.push({
      departmentId: reproDeptId,
      startTime: timers[0].endTime,
      endTime: status === 'IN_REPRO' ? null : addHours(timers[0].endTime, randomBetween(8, 48)),
    });
  }

  // ... continue for other departments

  return timers;
}
```

---

## 7. Test Commands

```json
// package.json scripts
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest run --dir tests/unit",
    "test:integration": "vitest run --dir tests/integration",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:coverage": "vitest run --coverage",
    "test:ci": "vitest run --coverage && playwright test"
  }
}
```

---

## 8. CI/CD Test Pipeline

```yaml
# .github/workflows/test.yml
name: Test

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test:unit

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test
        ports:
          - 5432:5432
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test
      - run: npm run test:integration
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
```
