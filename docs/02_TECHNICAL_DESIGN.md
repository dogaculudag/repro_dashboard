# Technical Design Specification
# Repro Department File Tracking System (RDFTS)

**Version:** 1.0  
**Date:** February 2, 2026

---

## 1. System Architecture Overview

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              Next.js Frontend (React + TypeScript)       │    │
│  │         Tailwind CSS + shadcn/ui + Recharts             │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS / REST API
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Application Layer                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                  Next.js API Routes                      │    │
│  │         (Server Actions + Route Handlers)                │    │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐    │    │
│  │  │ Auth.js     │ │ RBAC       │ │ Zod Validation  │    │    │
│  │  │ (NextAuth)  │ │ Middleware │ │ Layer           │    │    │
│  │  └─────────────┘ └─────────────┘ └─────────────────┘    │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Prisma ORM
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Data Layer                                │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                  PostgreSQL 15+                          │    │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────┐    │    │
│  │  │ Users   │ │ Files   │ │ Timers  │ │ Audit Logs  │    │    │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────────┘    │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Technology Stack

| Layer | Technology | Version | Rationale |
|-------|------------|---------|-----------|
| Frontend | Next.js (App Router) | 14.x | Full-stack React framework, SSR/SSG |
| UI Framework | React | 18.x | Component-based UI |
| Styling | Tailwind CSS | 3.x | Utility-first CSS, rapid development |
| Components | shadcn/ui | latest | Accessible, customizable components |
| Charts | Recharts | 2.x | React-native charting library |
| Language | TypeScript | 5.x | Type safety, better DX |
| Backend | Next.js API Routes | 14.x | Unified deployment |
| Authentication | NextAuth.js (Auth.js) | 5.x | Flexible auth, session management |
| ORM | Prisma | 5.x | Type-safe database access |
| Database | PostgreSQL | 15+ | ACID, JSONB, mature ecosystem |
| Validation | Zod | 3.x | Runtime type validation |
| Testing | Vitest + Playwright | latest | Unit and E2E testing |
| Containerization | Docker + Docker Compose | latest | Consistent environments |

### 1.3 Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Compose Stack                      │
│                                                              │
│  ┌──────────────────────┐    ┌──────────────────────┐       │
│  │    app (Next.js)     │    │   db (PostgreSQL)    │       │
│  │    Port: 3000        │───▶│   Port: 5432         │       │
│  │                      │    │   Volume: pgdata     │       │
│  └──────────────────────┘    └──────────────────────┘       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. State Machine Design

### 2.1 File Status Enum

```typescript
enum FileStatus {
  // Initial States
  AWAITING_ASSIGNMENT = 'AWAITING_ASSIGNMENT',    // Created, no designer assigned
  
  // Repro (Grafiker) States
  ASSIGNED = 'ASSIGNED',                          // Assigned to designer, pending takeover
  IN_REPRO = 'IN_REPRO',                         // Designer has taken over, working
  
  // Approval States (R100)
  APPROVAL_PREP = 'APPROVAL_PREP',               // At Önrepro for approval preparation
  CUSTOMER_APPROVAL = 'CUSTOMER_APPROVAL',       // Waiting for customer response
  
  // Quality States (R200)
  IN_QUALITY = 'IN_QUALITY',                     // At Quality/Plotter for review
  
  // Kolaj States
  IN_KOLAJ = 'IN_KOLAJ',                         // At Kolaj for final assembly
  
  // Terminal State
  SENT_TO_PRODUCTION = 'SENT_TO_PRODUCTION',     // Completed, closed
  
  // Special States
  REVISION_REQUIRED = 'REVISION_REQUIRED',       // NOK received, back to designer
}
```

### 2.2 State Transition Diagram

```
                              ┌─────────────────────────┐
                              │   AWAITING_ASSIGNMENT   │
                              │   (Önrepro creates)     │
                              └───────────┬─────────────┘
                                          │ Manager assigns designer
                                          ▼
                              ┌─────────────────────────┐
                              │       ASSIGNED          │
                              │  (pending Grafiker      │
                              │   takeover)             │
                              └───────────┬─────────────┘
                                          │ Grafiker does "Devral"
                                          ▼
             ┌────────────────────────────────────────────────────┐
             │                                                    │
             │           ┌─────────────────────────┐              │
             │           │       IN_REPRO          │◀─────────────┤
             │           │   (Designer working)    │              │
             │           └───────────┬─────────────┘              │
             │                       │                            │
             │     ┌─────────────────┼─────────────────┐          │
             │     │                 │                 │          │
             │     ▼                 ▼                 │          │
             │  ┌──────────┐  ┌──────────────┐        │          │
             │  │ No       │  │ Approval     │        │          │
             │  │ Approval │  │ Required     │        │          │
             │  │ Needed   │  │              │        │          │
             │  └────┬─────┘  └──────┬───────┘        │          │
             │       │               │                │          │
             │       │               ▼                │          │
             │       │    ┌─────────────────────┐     │          │
             │       │    │   APPROVAL_PREP     │     │          │
             │       │    │ (Önrepro prepares)  │     │          │
             │       │    └──────────┬──────────┘     │          │
             │       │               │                │          │
             │       │               ▼                │          │
             │       │    ┌─────────────────────┐     │          │
             │       │    │  CUSTOMER_APPROVAL  │     │          │
             │       │    │ (Waiting response)  │     │          │
             │       │    └──────────┬──────────┘     │          │
             │       │               │                │          │
             │       │      ┌───────┴───────┐        │          │
             │       │      │               │        │          │
             │       │   OK ▼            NOK▼        │          │
             │       │      │     ┌─────────────┐    │          │
             │       │      │     │REVISION_REQ │────┘          │
             │       │      │     │(back to same│               │
             │       │      │     │ Grafiker)   │               │
             │       │      │     └─────────────┘               │
             │       │      │                                   │
             │       ▼      ▼                                   │
             │    ┌─────────────────────────┐                   │
             │    │      IN_QUALITY         │                   │
             │    │   (Plotter review)      │                   │
             │    └───────────┬─────────────┘                   │
             │                │                                 │
             │       ┌───────┴───────┐                         │
             │       │               │                         │
             │    OK ▼            NOK▼                         │
             │       │     ┌─────────────┐                     │
             │       │     │REVISION_REQ │─────────────────────┘
             │       │     │(back to same│
             │       │     │ Grafiker)   │
             │       │     └─────────────┘
             │       │
             │       ▼
             │    ┌─────────────────────────┐
             │    │       IN_KOLAJ          │
             │    │   (Final assembly)      │
             │    └───────────┬─────────────┘
             │                │
             │                ▼
             │    ┌─────────────────────────┐
             │    │  SENT_TO_PRODUCTION     │
             │    │     (Terminal)          │
             │    └─────────────────────────┘
             │
             └──── MG2/MG3 Restart: Returns to APPROVAL_PREP
                   (iteration incremented, same designer)
```

### 2.3 Valid State Transitions

| From Status | To Status | Action | Triggered By |
|-------------|-----------|--------|--------------|
| AWAITING_ASSIGNMENT | ASSIGNED | Assign Designer | Manager |
| ASSIGNED | IN_REPRO | Devral | Grafiker |
| IN_REPRO | APPROVAL_PREP | Request Approval | Grafiker |
| IN_REPRO | IN_QUALITY | Direct to Quality (no approval) | Grafiker |
| APPROVAL_PREP | CUSTOMER_APPROVAL | Send to Customer | Önrepro |
| CUSTOMER_APPROVAL | IN_QUALITY | Customer OK | Önrepro/Manager |
| CUSTOMER_APPROVAL | REVISION_REQUIRED | Customer NOK | Önrepro/Manager |
| REVISION_REQUIRED | IN_REPRO | Devral | Grafiker |
| IN_QUALITY | IN_KOLAJ | Quality OK | Quality |
| IN_QUALITY | REVISION_REQUIRED | Quality NOK | Quality |
| IN_KOLAJ | SENT_TO_PRODUCTION | Complete | Kolaj |
| APPROVAL_PREP | APPROVAL_PREP | MG Restart | Önrepro |

---

## 3. Component Architecture

### 3.1 Frontend Component Hierarchy

```
app/
├── (auth)/
│   └── login/
│       └── page.tsx              # Login page
├── (dashboard)/
│   ├── layout.tsx                # Dashboard layout with sidebar
│   ├── page.tsx                  # Role-based redirect
│   ├── manager/
│   │   ├── page.tsx              # Manager dashboard
│   │   ├── assignments/
│   │   │   └── page.tsx          # Assignment pool
│   │   ├── reports/
│   │   │   └── page.tsx          # Reports & analytics
│   │   └── admin/
│   │       ├── users/
│   │       │   └── page.tsx      # User management
│   │       └── settings/
│   │           └── page.tsx      # System settings
│   ├── department/
│   │   └── page.tsx              # Department dashboard
│   ├── files/
│   │   ├── page.tsx              # File search
│   │   ├── new/
│   │   │   └── page.tsx          # Create file (Önrepro only)
│   │   └── [id]/
│   │       └── page.tsx          # File detail view
│   └── queue/
│       └── page.tsx              # My queue view
├── api/
│   ├── auth/
│   │   └── [...nextauth]/
│   │       └── route.ts          # NextAuth handler
│   ├── files/
│   │   ├── route.ts              # File CRUD
│   │   └── [id]/
│   │       ├── route.ts          # Single file operations
│   │       ├── takeover/
│   │       │   └── route.ts      # Devral action
│   │       ├── transfer/
│   │       │   └── route.ts      # Transfer action
│   │       ├── notes/
│   │       │   └── route.ts      # Notes CRUD
│   │       └── actions/
│   │           └── route.ts      # Workflow actions
│   ├── users/
│   │   └── route.ts              # User management
│   ├── reports/
│   │   └── route.ts              # Reporting endpoints
│   └── locations/
│       └── route.ts              # Location slots
└── components/
    ├── ui/                       # shadcn/ui components
    ├── layout/
    │   ├── Sidebar.tsx
    │   ├── Header.tsx
    │   └── Navigation.tsx
    ├── files/
    │   ├── FileCard.tsx
    │   ├── FileDetail.tsx
    │   ├── FileTimeline.tsx
    │   ├── FileForm.tsx
    │   ├── FileSearch.tsx
    │   └── FileActions.tsx
    ├── location/
    │   ├── LocationMap.tsx
    │   └── LocationSlot.tsx
    ├── dashboard/
    │   ├── StatsCard.tsx
    │   ├── WorkloadChart.tsx
    │   ├── BottleneckAlert.tsx
    │   └── AssignmentPool.tsx
    ├── notes/
    │   ├── NotesList.tsx
    │   └── NoteForm.tsx
    └── reports/
        ├── ThroughputChart.tsx
        ├── DepartmentStats.tsx
        └── DesignerPerformance.tsx
```

### 3.2 Backend Service Architecture

```
lib/
├── auth/
│   ├── auth.config.ts           # NextAuth configuration
│   └── rbac.ts                  # Role-based access control
├── db/
│   └── prisma.ts                # Prisma client singleton
├── services/
│   ├── file.service.ts          # File business logic
│   ├── timer.service.ts         # Timer management
│   ├── workflow.service.ts      # State machine logic
│   ├── report.service.ts        # Reporting logic
│   └── audit.service.ts         # Audit logging
├── validations/
│   ├── file.schema.ts           # Zod schemas for files
│   ├── user.schema.ts           # Zod schemas for users
│   └── action.schema.ts         # Zod schemas for actions
└── utils/
    ├── date.ts                  # Date/timezone utilities
    ├── errors.ts                # Custom error classes
    └── constants.ts             # System constants
```

---

## 4. Timer System Design

### 4.1 Timer Logic

```typescript
interface TimerLogic {
  // Invariant: At most one active timer per file at any time
  
  startTimer(fileId: string, departmentId: string, userId: string | null): Timer;
  // 1. Check no active timer exists for this file
  // 2. Create new timer with start_time = now()
  // 3. Update file.current_department_id
  
  stopTimer(timerId: string): Timer;
  // 1. Set end_time = now()
  // 2. Calculate duration_seconds
  
  transferFile(fileId: string, toDepartmentId: string): void;
  // 1. Stop current active timer (if any)
  // 2. Create transfer log
  // 3. Set file.pending_takeover = true
  // 4. Set file.current_department_id = toDepartmentId
  // Note: Does NOT start new timer - receiver must Devral
  
  takeoverFile(fileId: string, userId: string): void;
  // 1. Verify file is pending takeover to user's department
  // 2. Start new timer for this department
  // 3. Set file.pending_takeover = false
  // 4. Create takeover log
}
```

### 4.2 Concurrency Control

```typescript
// Use database transactions with optimistic locking
async function safeStartTimer(fileId: string, departmentId: string, userId: string) {
  return await prisma.$transaction(async (tx) => {
    // Lock the file row
    const file = await tx.file.findUnique({
      where: { id: fileId },
      include: { timers: { where: { end_time: null } } }
    });
    
    if (!file) throw new NotFoundError('File not found');
    
    // Check for active timer
    if (file.timers.length > 0) {
      throw new ConflictError('File already has an active timer');
    }
    
    // Create new timer
    const timer = await tx.timer.create({
      data: {
        file_id: fileId,
        department_id: departmentId,
        user_id: userId,
        start_time: new Date(),
      }
    });
    
    return timer;
  }, {
    isolationLevel: 'Serializable' // Prevent race conditions
  });
}
```

### 4.3 Timer Duration Calculation

```typescript
// Durations stored in seconds for precision
// Displayed in human-readable format

function calculateDuration(startTime: Date, endTime: Date): number {
  return Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}s ${minutes}d ${secs}sn`;
  } else if (minutes > 0) {
    return `${minutes}d ${secs}sn`;
  }
  return `${secs}sn`;
}
```

---

## 5. RBAC Implementation

### 5.1 Role Definitions

```typescript
enum Role {
  ADMIN = 'ADMIN',           // Bahar Hanım - full access
  ONREPRO = 'ONREPRO',       // Pre-production staff
  GRAFIKER = 'GRAFIKER',     // Designers
  KALITE = 'KALITE',         // Quality control
  KOLAJ = 'KOLAJ',           // Assembly staff
}

// Role to Department mapping
const ROLE_DEPARTMENT_MAP: Record<Role, string> = {
  [Role.ADMIN]: 'ADMIN',
  [Role.ONREPRO]: 'ONREPRO',
  [Role.GRAFIKER]: 'REPRO',
  [Role.KALITE]: 'KALITE',
  [Role.KOLAJ]: 'KOLAJ',
};
```

### 5.2 Permission Matrix

| Action | ADMIN | ONREPRO | GRAFIKER | KALITE | KOLAJ |
|--------|-------|---------|----------|--------|-------|
| Create File | ✓ | ✓ | ✗ | ✗ | ✗ |
| Assign Designer | ✓ | ✗ | ✗ | ✗ | ✗ |
| Takeover (own dept) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Transfer to next | ✓ | ✓ | ✓ | ✓ | ✓ |
| Add Notes | ✓ | ✓ | ✓ | ✓ | ✓ |
| Customer OK/NOK | ✓ | ✓ | ✗ | ✗ | ✗ |
| Quality OK/NOK | ✓ | ✗ | ✗ | ✓ | ✗ |
| Send to Production | ✓ | ✗ | ✗ | ✗ | ✓ |
| View Reports | ✓ | ✗ | ✗ | ✗ | ✗ |
| Manage Users | ✓ | ✗ | ✗ | ✗ | ✗ |
| Override Actions | ✓ | ✗ | ✗ | ✗ | ✗ |
| View All Files | ✓ | ✓ | Own | Dept | Dept |

### 5.3 RBAC Middleware

```typescript
// lib/auth/rbac.ts

import { getServerSession } from 'next-auth';
import { authOptions } from './auth.config';

type Permission = 
  | 'file:create'
  | 'file:assign'
  | 'file:takeover'
  | 'file:transfer'
  | 'file:view_all'
  | 'note:create'
  | 'customer:approve'
  | 'quality:approve'
  | 'production:send'
  | 'report:view'
  | 'user:manage'
  | 'override:execute';

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ADMIN: [
    'file:create', 'file:assign', 'file:takeover', 'file:transfer', 'file:view_all',
    'note:create', 'customer:approve', 'quality:approve', 'production:send',
    'report:view', 'user:manage', 'override:execute'
  ],
  ONREPRO: [
    'file:create', 'file:takeover', 'file:transfer', 'file:view_all',
    'note:create', 'customer:approve'
  ],
  GRAFIKER: [
    'file:takeover', 'file:transfer', 'note:create'
  ],
  KALITE: [
    'file:takeover', 'file:transfer', 'note:create', 'quality:approve'
  ],
  KOLAJ: [
    'file:takeover', 'file:transfer', 'note:create', 'production:send'
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export async function requirePermission(permission: Permission) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    throw new UnauthorizedError('Authentication required');
  }
  
  if (!hasPermission(session.user.role as Role, permission)) {
    throw new ForbiddenError('Insufficient permissions');
  }
  
  return session.user;
}
```

---

## 6. API Design Patterns

### 6.1 Response Format

```typescript
// Success response
interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: {
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

// Error response
interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}
```

### 6.2 Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| UNAUTHORIZED | 401 | Authentication required |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| CONFLICT | 409 | State conflict (e.g., duplicate timer) |
| VALIDATION_ERROR | 422 | Input validation failed |
| INTERNAL_ERROR | 500 | Server error |

### 6.3 Validation Pattern

```typescript
// Using Zod for runtime validation
import { z } from 'zod';

export const CreateFileSchema = z.object({
  file_no: z.string().min(1).max(50),
  customer_name: z.string().min(1).max(200),
  customer_no: z.string().optional(),
  ksm_data: z.object({
    width: z.number().optional(),
    height: z.number().optional(),
    colors: z.array(z.string()).optional(),
    // ... other KSM fields
  }).optional(),
  location_slot_id: z.string().uuid(),
});

export const TransferFileSchema = z.object({
  to_department_id: z.string().uuid(),
  location_slot_id: z.string().uuid().optional(),
  note: z.string().optional(),
});

export const NokActionSchema = z.object({
  note: z.string().min(10, 'NOK note must be at least 10 characters'),
});
```

---

## 7. Real-time Considerations

### 7.1 Polling Strategy (MVP)

For MVP, use polling for dashboard updates:

```typescript
// Client-side polling hook
function usePolling<T>(
  fetcher: () => Promise<T>,
  intervalMs: number = 30000
) {
  const [data, setData] = useState<T | null>(null);
  
  useEffect(() => {
    let mounted = true;
    
    const poll = async () => {
      try {
        const result = await fetcher();
        if (mounted) setData(result);
      } catch (error) {
        console.error('Polling error:', error);
      }
    };
    
    poll(); // Initial fetch
    const interval = setInterval(poll, intervalMs);
    
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [fetcher, intervalMs]);
  
  return data;
}
```

### 7.2 Future: WebSocket Support (Phase 2)

```typescript
// Phase 2: Real-time updates via WebSocket
// Using Socket.io or similar

interface FileUpdateEvent {
  type: 'FILE_UPDATED' | 'TIMER_STARTED' | 'TIMER_STOPPED' | 'TRANSFER';
  fileId: string;
  data: Partial<File>;
}

// Broadcast to relevant users based on:
// - File owner (assigned designer)
// - Department members
// - Managers (all updates)
```

---

## 8. Timezone Handling

### 8.1 Storage Strategy

- All timestamps stored in UTC in database
- Frontend converts to Europe/Istanbul for display
- API accepts and returns ISO 8601 strings

```typescript
// lib/utils/date.ts
import { formatInTimeZone } from 'date-fns-tz';

const TIMEZONE = 'Europe/Istanbul';

export function formatDisplayDate(date: Date | string): string {
  return formatInTimeZone(new Date(date), TIMEZONE, 'dd.MM.yyyy HH:mm');
}

export function formatDisplayTime(date: Date | string): string {
  return formatInTimeZone(new Date(date), TIMEZONE, 'HH:mm:ss');
}
```

---

## 9. Caching Strategy

### 9.1 Server-side Caching

```typescript
// Use Next.js built-in caching for reports
// Reports can be cached for 5 minutes

export const revalidate = 300; // 5 minutes

async function getReportData() {
  // This will be cached
  return await prisma.file.aggregate({...});
}
```

### 9.2 Client-side Caching

Use React Query / SWR for client-side caching with stale-while-revalidate pattern.

```typescript
// Using SWR
import useSWR from 'swr';

function useFile(fileId: string) {
  return useSWR(
    `/api/files/${fileId}`,
    fetcher,
    {
      refreshInterval: 10000, // Refresh every 10 seconds
      revalidateOnFocus: true,
    }
  );
}
```

---

## 10. Logging & Monitoring

### 10.1 Structured Logging

```typescript
// lib/utils/logger.ts
const logger = {
  info: (message: string, meta?: Record<string, any>) => {
    console.log(JSON.stringify({
      level: 'info',
      timestamp: new Date().toISOString(),
      message,
      ...meta
    }));
  },
  error: (message: string, error: Error, meta?: Record<string, any>) => {
    console.error(JSON.stringify({
      level: 'error',
      timestamp: new Date().toISOString(),
      message,
      error: error.message,
      stack: error.stack,
      ...meta
    }));
  },
};
```

### 10.2 Audit Trail

All business actions are logged to the `audit_logs` table with:
- Action type
- User who performed it
- Timestamp
- Before/after state (in payload)
- IP address (optional)

---

## 11. Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Page Load Time | < 2s | First Contentful Paint |
| API Response Time | < 200ms | 95th percentile |
| File Search | < 100ms | Index lookup |
| Dashboard Load | < 3s | Full render |
| Database Query | < 50ms | 95th percentile |
| Concurrent Users | 50+ | Load testing |
