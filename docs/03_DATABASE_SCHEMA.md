# Database Schema & Prisma Models
# Repro Department File Tracking System

**Version:** 1.0  
**Date:** February 2, 2026

---

## 1. Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│     users       │       │   departments   │       │ location_slots  │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │       │ id (PK)         │       │ id (PK)         │
│ username        │       │ name            │       │ code            │
│ password_hash   │       │ code            │       │ name            │
│ full_name       │       │ is_virtual      │       │ area            │
│ role            │       │ sla_hours       │       │ row             │
│ department_id   │───────│ created_at      │       │ column          │
│ is_active       │       └─────────────────┘       │ is_active       │
│ created_at      │               │                 └─────────────────┘
│ updated_at      │               │                         │
└─────────────────┘               │                         │
        │                         │                         │
        │                         │                         │
        ▼                         ▼                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                              files                                   │
├─────────────────────────────────────────────────────────────────────┤
│ id (PK)                                                              │
│ file_no (UNIQUE)                                                     │
│ customer_name                                                        │
│ customer_no                                                          │
│ ksm_data (JSONB)                                                     │
│ status                                                               │
│ assigned_designer_id (FK → users) ─────────────────────────────────┐ │
│ current_department_id (FK → departments) ──────────────────────────┘ │
│ current_location_slot_id (FK → location_slots) ────────────────────┘ │
│ iteration_number                                                     │
│ iteration_label                                                      │
│ pending_takeover                                                     │
│ requires_approval                                                    │
│ priority                                                             │
│ created_at                                                           │
│ updated_at                                                           │
│ closed_at                                                            │
└─────────────────────────────────────────────────────────────────────┘
        │                    │                    │
        │                    │                    │
        ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│     timers      │  │   audit_logs    │  │     notes       │
├─────────────────┤  ├─────────────────┤  ├─────────────────┤
│ id (PK)         │  │ id (PK)         │  │ id (PK)         │
│ file_id (FK)    │  │ file_id (FK)    │  │ file_id (FK)    │
│ department_id   │  │ action_type     │  │ user_id (FK)    │
│ user_id (FK)    │  │ from_dept_id    │  │ department_id   │
│ start_time      │  │ to_dept_id      │  │ message         │
│ end_time        │  │ by_user_id (FK) │  │ is_system       │
│ duration_secs   │  │ payload (JSONB) │  │ created_at      │
│ reason_code     │  │ timestamp       │  └─────────────────┘
│ created_at      │  │ ip_address      │
└─────────────────┘  └─────────────────┘

┌─────────────────┐
│  sla_targets    │
├─────────────────┤
│ id (PK)         │
│ department_id   │
│ warning_hours   │
│ critical_hours  │
│ created_at      │
│ updated_at      │
└─────────────────┘
```

---

## 2. Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// ENUMS
// ============================================

enum Role {
  ADMIN
  ONREPRO
  GRAFIKER
  KALITE
  KOLAJ
}

enum FileStatus {
  AWAITING_ASSIGNMENT
  ASSIGNED
  IN_REPRO
  APPROVAL_PREP
  CUSTOMER_APPROVAL
  REVISION_REQUIRED
  IN_QUALITY
  IN_KOLAJ
  SENT_TO_PRODUCTION
}

enum ActionType {
  CREATE
  ASSIGN
  TAKEOVER
  TRANSFER
  CUSTOMER_SENT
  CUSTOMER_OK
  CUSTOMER_NOK
  QUALITY_OK
  QUALITY_NOK
  RESTART_MG
  CLOSE
  OVERRIDE
  LOCATION_UPDATE
  NOTE_ADDED
  STATUS_CHANGE
}

enum Priority {
  LOW
  NORMAL
  HIGH
  URGENT
}

enum LocationArea {
  WAITING
  REPRO
  QUALITY
  KOLAJ
  ARCHIVE
}

// ============================================
// MODELS
// ============================================

model User {
  id            String   @id @default(uuid())
  username      String   @unique @db.VarChar(50)
  passwordHash  String   @map("password_hash") @db.VarChar(255)
  fullName      String   @map("full_name") @db.VarChar(100)
  email         String?  @unique @db.VarChar(255)
  role          Role
  departmentId  String   @map("department_id")
  isActive      Boolean  @default(true) @map("is_active")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  // Relations
  department       Department @relation(fields: [departmentId], references: [id])
  assignedFiles    File[]     @relation("AssignedDesigner")
  timers           Timer[]
  notes            Note[]
  auditLogs        AuditLog[] @relation("ByUser")

  @@map("users")
  @@index([role])
  @@index([departmentId])
  @@index([isActive])
}

model Department {
  id         String   @id @default(uuid())
  name       String   @db.VarChar(100)
  code       String   @unique @db.VarChar(20)
  isVirtual  Boolean  @default(false) @map("is_virtual") // For CustomerApproval
  sortOrder  Int      @default(0) @map("sort_order")
  createdAt  DateTime @default(now()) @map("created_at")

  // Relations
  users            User[]
  currentFiles     File[]     @relation("CurrentDepartment")
  timers           Timer[]
  notes            Note[]
  fromAuditLogs    AuditLog[] @relation("FromDepartment")
  toAuditLogs      AuditLog[] @relation("ToDepartment")
  slaTarget        SlaTarget?

  @@map("departments")
}

model LocationSlot {
  id        String       @id @default(uuid())
  code      String       @unique @db.VarChar(20) // e.g., "A1", "R5", "Q3"
  name      String       @db.VarChar(100)
  area      LocationArea
  row       Int
  column    Int
  isActive  Boolean      @default(true) @map("is_active")
  createdAt DateTime     @default(now()) @map("created_at")

  // Relations
  files File[]

  @@map("location_slots")
  @@index([area])
  @@index([isActive])
}

model File {
  id                    String     @id @default(uuid())
  fileNo                String     @unique @map("file_no") @db.VarChar(50)
  customerName          String     @map("customer_name") @db.VarChar(200)
  customerNo            String?    @map("customer_no") @db.VarChar(50)
  ksmData               Json?      @map("ksm_data") @db.JsonB
  status                FileStatus @default(AWAITING_ASSIGNMENT)
  assignedDesignerId    String?    @map("assigned_designer_id")
  currentDepartmentId   String     @map("current_department_id")
  currentLocationSlotId String?    @map("current_location_slot_id")
  iterationNumber       Int        @default(1) @map("iteration_number")
  iterationLabel        String     @default("MG1") @map("iteration_label") @db.VarChar(20)
  pendingTakeover       Boolean    @default(false) @map("pending_takeover")
  requiresApproval      Boolean    @default(true) @map("requires_approval")
  priority              Priority   @default(NORMAL)
  createdAt             DateTime   @default(now()) @map("created_at")
  updatedAt             DateTime   @updatedAt @map("updated_at")
  closedAt              DateTime?  @map("closed_at")

  // Relations
  assignedDesigner    User?         @relation("AssignedDesigner", fields: [assignedDesignerId], references: [id])
  currentDepartment   Department    @relation("CurrentDepartment", fields: [currentDepartmentId], references: [id])
  currentLocationSlot LocationSlot? @relation(fields: [currentLocationSlotId], references: [id])
  timers              Timer[]
  notes               Note[]
  auditLogs           AuditLog[]

  @@map("files")
  @@index([fileNo])
  @@index([status])
  @@index([assignedDesignerId])
  @@index([currentDepartmentId])
  @@index([createdAt])
  @@index([pendingTakeover])
  @@index([customerName])
}

model Timer {
  id              String    @id @default(uuid())
  fileId          String    @map("file_id")
  departmentId    String    @map("department_id")
  userId          String?   @map("user_id") // Null for CustomerApproval
  startTime       DateTime  @map("start_time")
  endTime         DateTime? @map("end_time")
  durationSeconds Int?      @map("duration_seconds")
  reasonCode      String?   @map("reason_code") @db.VarChar(50)
  createdAt       DateTime  @default(now()) @map("created_at")

  // Relations
  file       File       @relation(fields: [fileId], references: [id], onDelete: Cascade)
  department Department @relation(fields: [departmentId], references: [id])
  user       User?      @relation(fields: [userId], references: [id])

  @@map("timers")
  @@index([fileId])
  @@index([departmentId])
  @@index([userId])
  @@index([startTime])
  @@index([endTime])
}

model Note {
  id           String   @id @default(uuid())
  fileId       String   @map("file_id")
  userId       String   @map("user_id")
  departmentId String   @map("department_id")
  message      String   @db.Text
  isSystem     Boolean  @default(false) @map("is_system") // Auto-generated notes
  createdAt    DateTime @default(now()) @map("created_at")

  // Relations
  file       File       @relation(fields: [fileId], references: [id], onDelete: Cascade)
  user       User       @relation(fields: [userId], references: [id])
  department Department @relation(fields: [departmentId], references: [id])

  @@map("notes")
  @@index([fileId])
  @@index([createdAt])
}

model AuditLog {
  id               String     @id @default(uuid())
  fileId           String     @map("file_id")
  actionType       ActionType @map("action_type")
  fromDepartmentId String?    @map("from_department_id")
  toDepartmentId   String?    @map("to_department_id")
  byUserId         String     @map("by_user_id")
  payload          Json?      @db.JsonB
  timestamp        DateTime   @default(now())
  ipAddress        String?    @map("ip_address") @db.VarChar(45)

  // Relations
  file           File        @relation(fields: [fileId], references: [id], onDelete: Cascade)
  fromDepartment Department? @relation("FromDepartment", fields: [fromDepartmentId], references: [id])
  toDepartment   Department? @relation("ToDepartment", fields: [toDepartmentId], references: [id])
  byUser         User        @relation("ByUser", fields: [byUserId], references: [id])

  @@map("audit_logs")
  @@index([fileId])
  @@index([actionType])
  @@index([timestamp])
  @@index([byUserId])
}

model SlaTarget {
  id            String   @id @default(uuid())
  departmentId  String   @unique @map("department_id")
  warningHours  Int      @map("warning_hours") // Yellow alert threshold
  criticalHours Int      @map("critical_hours") // Red alert threshold
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  // Relations
  department Department @relation(fields: [departmentId], references: [id])

  @@map("sla_targets")
}

model SystemConfig {
  id        String   @id @default(uuid())
  key       String   @unique @db.VarChar(100)
  value     Json     @db.JsonB
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("system_config")
}
```

---

## 3. Migration Scripts Outline

### 3.1 Initial Migration

```sql
-- migrations/0001_initial.sql

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enums
CREATE TYPE role AS ENUM ('ADMIN', 'ONREPRO', 'GRAFIKER', 'KALITE', 'KOLAJ');
CREATE TYPE file_status AS ENUM (
  'AWAITING_ASSIGNMENT', 'ASSIGNED', 'IN_REPRO', 'APPROVAL_PREP',
  'CUSTOMER_APPROVAL', 'REVISION_REQUIRED', 'IN_QUALITY', 'IN_KOLAJ',
  'SENT_TO_PRODUCTION'
);
CREATE TYPE action_type AS ENUM (
  'CREATE', 'ASSIGN', 'TAKEOVER', 'TRANSFER', 'CUSTOMER_SENT',
  'CUSTOMER_OK', 'CUSTOMER_NOK', 'QUALITY_OK', 'QUALITY_NOK',
  'RESTART_MG', 'CLOSE', 'OVERRIDE', 'LOCATION_UPDATE', 'NOTE_ADDED',
  'STATUS_CHANGE'
);
CREATE TYPE priority AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
CREATE TYPE location_area AS ENUM ('WAITING', 'REPRO', 'QUALITY', 'KOLAJ', 'ARCHIVE');

-- Create tables
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) UNIQUE NOT NULL,
  is_virtual BOOLEAN DEFAULT FALSE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE,
  role role NOT NULL,
  department_id UUID NOT NULL REFERENCES departments(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE location_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  area location_area NOT NULL,
  row INT NOT NULL,
  column INT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_no VARCHAR(50) UNIQUE NOT NULL,
  customer_name VARCHAR(200) NOT NULL,
  customer_no VARCHAR(50),
  ksm_data JSONB,
  status file_status DEFAULT 'AWAITING_ASSIGNMENT',
  assigned_designer_id UUID REFERENCES users(id),
  current_department_id UUID NOT NULL REFERENCES departments(id),
  current_location_slot_id UUID REFERENCES location_slots(id),
  iteration_number INT DEFAULT 1,
  iteration_label VARCHAR(20) DEFAULT 'MG1',
  pending_takeover BOOLEAN DEFAULT FALSE,
  requires_approval BOOLEAN DEFAULT TRUE,
  priority priority DEFAULT 'NORMAL',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  closed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE timers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments(id),
  user_id UUID REFERENCES users(id),
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  duration_seconds INT,
  reason_code VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  department_id UUID NOT NULL REFERENCES departments(id),
  message TEXT NOT NULL,
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  action_type action_type NOT NULL,
  from_department_id UUID REFERENCES departments(id),
  to_department_id UUID REFERENCES departments(id),
  by_user_id UUID NOT NULL REFERENCES users(id),
  payload JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address VARCHAR(45)
);

CREATE TABLE sla_targets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  department_id UUID UNIQUE NOT NULL REFERENCES departments(id),
  warning_hours INT NOT NULL,
  critical_hours INT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE system_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(100) UNIQUE NOT NULL,
  value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_department ON users(department_id);
CREATE INDEX idx_users_active ON users(is_active);

CREATE INDEX idx_location_slots_area ON location_slots(area);
CREATE INDEX idx_location_slots_active ON location_slots(is_active);

CREATE INDEX idx_files_file_no ON files(file_no);
CREATE INDEX idx_files_status ON files(status);
CREATE INDEX idx_files_assigned_designer ON files(assigned_designer_id);
CREATE INDEX idx_files_current_department ON files(current_department_id);
CREATE INDEX idx_files_created_at ON files(created_at);
CREATE INDEX idx_files_pending_takeover ON files(pending_takeover);
CREATE INDEX idx_files_customer_name ON files(customer_name);

CREATE INDEX idx_timers_file ON timers(file_id);
CREATE INDEX idx_timers_department ON timers(department_id);
CREATE INDEX idx_timers_user ON timers(user_id);
CREATE INDEX idx_timers_start_time ON timers(start_time);
CREATE INDEX idx_timers_end_time ON timers(end_time);

CREATE INDEX idx_notes_file ON notes(file_id);
CREATE INDEX idx_notes_created_at ON notes(created_at);

CREATE INDEX idx_audit_logs_file ON audit_logs(file_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action_type);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_user ON audit_logs(by_user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_files_updated_at
    BEFORE UPDATE ON files
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sla_targets_updated_at
    BEFORE UPDATE ON sla_targets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_config_updated_at
    BEFORE UPDATE ON system_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## 4. Seed Data Script

```typescript
// prisma/seed.ts

import { PrismaClient, Role, LocationArea, FileStatus, Priority } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // ========================================
  // 1. Create Departments
  // ========================================
  const departments = await Promise.all([
    prisma.department.create({
      data: { name: 'Yönetim', code: 'ADMIN', sortOrder: 0 }
    }),
    prisma.department.create({
      data: { name: 'Ön Repro', code: 'ONREPRO', sortOrder: 1 }
    }),
    prisma.department.create({
      data: { name: 'Repro', code: 'REPRO', sortOrder: 2 }
    }),
    prisma.department.create({
      data: { name: 'Kalite', code: 'KALITE', sortOrder: 3 }
    }),
    prisma.department.create({
      data: { name: 'Kolaj', code: 'KOLAJ', sortOrder: 4 }
    }),
    prisma.department.create({
      data: { name: 'Müşteri Onayı', code: 'CUSTOMER', isVirtual: true, sortOrder: 5 }
    }),
  ]);

  const deptMap = Object.fromEntries(departments.map(d => [d.code, d]));

  // ========================================
  // 2. Create SLA Targets
  // ========================================
  await Promise.all([
    prisma.slaTarget.create({
      data: { departmentId: deptMap.ONREPRO.id, warningHours: 4, criticalHours: 8 }
    }),
    prisma.slaTarget.create({
      data: { departmentId: deptMap.REPRO.id, warningHours: 24, criticalHours: 48 }
    }),
    prisma.slaTarget.create({
      data: { departmentId: deptMap.KALITE.id, warningHours: 4, criticalHours: 8 }
    }),
    prisma.slaTarget.create({
      data: { departmentId: deptMap.KOLAJ.id, warningHours: 8, criticalHours: 16 }
    }),
    prisma.slaTarget.create({
      data: { departmentId: deptMap.CUSTOMER.id, warningHours: 48, criticalHours: 120 }
    }),
  ]);

  // ========================================
  // 3. Create Users
  // ========================================
  const passwordHash = await bcrypt.hash('password123', 10);

  const users = await Promise.all([
    // Admin/Manager
    prisma.user.create({
      data: {
        username: 'bahar',
        passwordHash,
        fullName: 'Bahar Hanım',
        email: 'bahar@company.com',
        role: Role.ADMIN,
        departmentId: deptMap.ADMIN.id,
      }
    }),
    // Önrepro Staff
    prisma.user.create({
      data: {
        username: 'onrepro1',
        passwordHash,
        fullName: 'Mehmet Yılmaz',
        email: 'mehmet@company.com',
        role: Role.ONREPRO,
        departmentId: deptMap.ONREPRO.id,
      }
    }),
    prisma.user.create({
      data: {
        username: 'onrepro2',
        passwordHash,
        fullName: 'Ayşe Kaya',
        email: 'ayse@company.com',
        role: Role.ONREPRO,
        departmentId: deptMap.ONREPRO.id,
      }
    }),
    // Grafiker (Designers)
    prisma.user.create({
      data: {
        username: 'grafiker1',
        passwordHash,
        fullName: 'Ali Demir',
        email: 'ali@company.com',
        role: Role.GRAFIKER,
        departmentId: deptMap.REPRO.id,
      }
    }),
    prisma.user.create({
      data: {
        username: 'grafiker2',
        passwordHash,
        fullName: 'Zeynep Öz',
        email: 'zeynep@company.com',
        role: Role.GRAFIKER,
        departmentId: deptMap.REPRO.id,
      }
    }),
    prisma.user.create({
      data: {
        username: 'grafiker3',
        passwordHash,
        fullName: 'Can Yıldız',
        email: 'can@company.com',
        role: Role.GRAFIKER,
        departmentId: deptMap.REPRO.id,
      }
    }),
    // Quality Staff
    prisma.user.create({
      data: {
        username: 'kalite1',
        passwordHash,
        fullName: 'Fatma Şahin',
        email: 'fatma@company.com',
        role: Role.KALITE,
        departmentId: deptMap.KALITE.id,
      }
    }),
    // Kolaj Staff
    prisma.user.create({
      data: {
        username: 'kolaj1',
        passwordHash,
        fullName: 'Hasan Çelik',
        email: 'hasan@company.com',
        role: Role.KOLAJ,
        departmentId: deptMap.KOLAJ.id,
      }
    }),
  ]);

  const userMap = Object.fromEntries(users.map(u => [u.username, u]));

  // ========================================
  // 4. Create Location Slots
  // ========================================
  const locationSlots: any[] = [];

  // Waiting Area (A1-A10)
  for (let i = 1; i <= 10; i++) {
    locationSlots.push({
      code: `A${i}`,
      name: `Bekleme Alanı ${i}`,
      area: LocationArea.WAITING,
      row: Math.ceil(i / 5),
      column: ((i - 1) % 5) + 1,
    });
  }

  // Repro Desks (R1-R10)
  for (let i = 1; i <= 10; i++) {
    locationSlots.push({
      code: `R${i}`,
      name: `Repro Masası ${i}`,
      area: LocationArea.REPRO,
      row: Math.ceil(i / 5),
      column: ((i - 1) % 5) + 1,
    });
  }

  // Quality Shelf (Q1-Q5)
  for (let i = 1; i <= 5; i++) {
    locationSlots.push({
      code: `Q${i}`,
      name: `Kalite Rafı ${i}`,
      area: LocationArea.QUALITY,
      row: 1,
      column: i,
    });
  }

  // Kolaj Area (K1-K5)
  for (let i = 1; i <= 5; i++) {
    locationSlots.push({
      code: `K${i}`,
      name: `Kolaj Alanı ${i}`,
      area: LocationArea.KOLAJ,
      row: 1,
      column: i,
    });
  }

  await prisma.locationSlot.createMany({ data: locationSlots });
  const slots = await prisma.locationSlot.findMany();
  const slotMap = Object.fromEntries(slots.map(s => [s.code, s]));

  // ========================================
  // 5. Create Sample Files
  // ========================================
  
  // File 1: Awaiting Assignment
  const file1 = await prisma.file.create({
    data: {
      fileNo: 'REP-2026-0001',
      customerName: 'ABC Ambalaj A.Ş.',
      customerNo: 'CUST-001',
      ksmData: {
        width: 1200,
        height: 800,
        colors: ['Cyan', 'Magenta', 'Yellow', 'Black'],
        cylinder: 'C-120',
      },
      status: FileStatus.AWAITING_ASSIGNMENT,
      currentDepartmentId: deptMap.ONREPRO.id,
      currentLocationSlotId: slotMap.A1.id,
      priority: Priority.NORMAL,
    }
  });

  await prisma.auditLog.create({
    data: {
      fileId: file1.id,
      actionType: 'CREATE',
      toDepartmentId: deptMap.ONREPRO.id,
      byUserId: userMap.onrepro1.id,
      payload: { initial: true },
    }
  });

  // File 2: Assigned, In Repro
  const file2 = await prisma.file.create({
    data: {
      fileNo: 'REP-2026-0002',
      customerName: 'XYZ Plastik Ltd.',
      customerNo: 'CUST-002',
      ksmData: {
        width: 800,
        height: 600,
        colors: ['Pantone 485', 'Black', 'White'],
        cylinder: 'C-080',
      },
      status: FileStatus.IN_REPRO,
      assignedDesignerId: userMap.grafiker1.id,
      currentDepartmentId: deptMap.REPRO.id,
      currentLocationSlotId: slotMap.R1.id,
      priority: Priority.HIGH,
    }
  });

  // Create timers and logs for file2
  const file2Timer = await prisma.timer.create({
    data: {
      fileId: file2.id,
      departmentId: deptMap.REPRO.id,
      userId: userMap.grafiker1.id,
      startTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    }
  });

  await prisma.auditLog.createMany({
    data: [
      {
        fileId: file2.id,
        actionType: 'CREATE',
        toDepartmentId: deptMap.ONREPRO.id,
        byUserId: userMap.onrepro1.id,
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
      {
        fileId: file2.id,
        actionType: 'ASSIGN',
        toDepartmentId: deptMap.REPRO.id,
        byUserId: userMap.bahar.id,
        payload: { assignedTo: userMap.grafiker1.fullName },
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
      },
      {
        fileId: file2.id,
        actionType: 'TAKEOVER',
        fromDepartmentId: deptMap.ONREPRO.id,
        toDepartmentId: deptMap.REPRO.id,
        byUserId: userMap.grafiker1.id,
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      },
    ]
  });

  // File 3: In Quality
  const file3 = await prisma.file.create({
    data: {
      fileNo: 'REP-2026-0003',
      customerName: 'DEF Gıda San.',
      customerNo: 'CUST-003',
      ksmData: {
        width: 1000,
        height: 700,
        colors: ['CMYK'],
        cylinder: 'C-100',
      },
      status: FileStatus.IN_QUALITY,
      assignedDesignerId: userMap.grafiker2.id,
      currentDepartmentId: deptMap.KALITE.id,
      currentLocationSlotId: slotMap.Q1.id,
      requiresApproval: false,
      priority: Priority.NORMAL,
    }
  });

  await prisma.timer.create({
    data: {
      fileId: file3.id,
      departmentId: deptMap.KALITE.id,
      userId: userMap.kalite1.id,
      startTime: new Date(Date.now() - 30 * 60 * 1000), // 30 mins ago
    }
  });

  // File 4: Customer Approval waiting
  const file4 = await prisma.file.create({
    data: {
      fileNo: 'REP-2026-0004',
      customerName: 'GHI Kozmetik',
      customerNo: 'CUST-004',
      ksmData: {
        width: 600,
        height: 400,
        colors: ['Gold', 'Silver', 'Black'],
        cylinder: 'C-060',
      },
      status: FileStatus.CUSTOMER_APPROVAL,
      assignedDesignerId: userMap.grafiker3.id,
      currentDepartmentId: deptMap.CUSTOMER.id,
      currentLocationSlotId: slotMap.A5.id,
      requiresApproval: true,
      priority: Priority.URGENT,
    }
  });

  await prisma.timer.create({
    data: {
      fileId: file4.id,
      departmentId: deptMap.CUSTOMER.id,
      userId: null, // Virtual department
      startTime: new Date(Date.now() - 48 * 60 * 60 * 1000), // 2 days ago
    }
  });

  // File 5: Completed (Sent to Production)
  const file5 = await prisma.file.create({
    data: {
      fileNo: 'REP-2026-0005',
      customerName: 'JKL Tekstil',
      customerNo: 'CUST-005',
      ksmData: {
        width: 1500,
        height: 1000,
        colors: ['CMYK', 'Spot Orange'],
        cylinder: 'C-150',
      },
      status: FileStatus.SENT_TO_PRODUCTION,
      assignedDesignerId: userMap.grafiker1.id,
      currentDepartmentId: deptMap.KOLAJ.id,
      currentLocationSlotId: null,
      priority: Priority.NORMAL,
      closedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
    }
  });

  // Create completed timers for file5
  await prisma.timer.createMany({
    data: [
      {
        fileId: file5.id,
        departmentId: deptMap.ONREPRO.id,
        userId: userMap.onrepro1.id,
        startTime: new Date(Date.now() - 72 * 60 * 60 * 1000),
        endTime: new Date(Date.now() - 70 * 60 * 60 * 1000),
        durationSeconds: 7200,
      },
      {
        fileId: file5.id,
        departmentId: deptMap.REPRO.id,
        userId: userMap.grafiker1.id,
        startTime: new Date(Date.now() - 70 * 60 * 60 * 1000),
        endTime: new Date(Date.now() - 50 * 60 * 60 * 1000),
        durationSeconds: 72000,
      },
      {
        fileId: file5.id,
        departmentId: deptMap.KALITE.id,
        userId: userMap.kalite1.id,
        startTime: new Date(Date.now() - 50 * 60 * 60 * 1000),
        endTime: new Date(Date.now() - 48 * 60 * 60 * 1000),
        durationSeconds: 7200,
      },
      {
        fileId: file5.id,
        departmentId: deptMap.KOLAJ.id,
        userId: userMap.kolaj1.id,
        startTime: new Date(Date.now() - 48 * 60 * 60 * 1000),
        endTime: new Date(Date.now() - 12 * 60 * 60 * 1000),
        durationSeconds: 129600,
      },
    ]
  });

  // Add notes
  await prisma.note.createMany({
    data: [
      {
        fileId: file2.id,
        userId: userMap.grafiker1.id,
        departmentId: deptMap.REPRO.id,
        message: 'Renk eşleştirmesi yapılıyor, müşteri talebi doğrultusunda Pantone değerleri kontrol edilecek.',
      },
      {
        fileId: file4.id,
        userId: userMap.onrepro2.id,
        departmentId: deptMap.ONREPRO.id,
        message: 'Müşteriye GMG proof gönderildi. Onay bekleniyor.',
      },
      {
        fileId: file3.id,
        userId: userMap.grafiker2.id,
        departmentId: deptMap.REPRO.id,
        message: 'Tasarım tamamlandı, onay gerektirmiyor.',
      },
    ]
  });

  console.log('Seed completed successfully!');
  console.log(`Created ${departments.length} departments`);
  console.log(`Created ${users.length} users`);
  console.log(`Created ${slots.length} location slots`);
  console.log('Created 5 sample files with timers and logs');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

---

## 5. Useful Database Views (Optional)

```sql
-- View: Active files with current timer duration
CREATE OR REPLACE VIEW v_active_files AS
SELECT 
  f.id,
  f.file_no,
  f.customer_name,
  f.status,
  f.priority,
  d.name AS current_department,
  u.full_name AS assigned_designer,
  ls.code AS location_code,
  ls.name AS location_name,
  t.start_time AS timer_start,
  EXTRACT(EPOCH FROM (NOW() - t.start_time))::INT AS elapsed_seconds,
  st.warning_hours * 3600 AS warning_threshold,
  st.critical_hours * 3600 AS critical_threshold,
  CASE
    WHEN EXTRACT(EPOCH FROM (NOW() - t.start_time)) > st.critical_hours * 3600 THEN 'CRITICAL'
    WHEN EXTRACT(EPOCH FROM (NOW() - t.start_time)) > st.warning_hours * 3600 THEN 'WARNING'
    ELSE 'OK'
  END AS sla_status
FROM files f
JOIN departments d ON f.current_department_id = d.id
LEFT JOIN users u ON f.assigned_designer_id = u.id
LEFT JOIN location_slots ls ON f.current_location_slot_id = ls.id
LEFT JOIN timers t ON t.file_id = f.id AND t.end_time IS NULL
LEFT JOIN sla_targets st ON st.department_id = f.current_department_id
WHERE f.status != 'SENT_TO_PRODUCTION';

-- View: Department statistics
CREATE OR REPLACE VIEW v_department_stats AS
SELECT 
  d.id AS department_id,
  d.name AS department_name,
  d.code AS department_code,
  COUNT(DISTINCT CASE WHEN f.status != 'SENT_TO_PRODUCTION' THEN f.id END) AS active_files,
  COUNT(DISTINCT CASE WHEN f.pending_takeover = true THEN f.id END) AS pending_takeover,
  AVG(t.duration_seconds) FILTER (WHERE t.duration_seconds IS NOT NULL) AS avg_duration_seconds,
  MAX(t.duration_seconds) FILTER (WHERE t.duration_seconds IS NOT NULL) AS max_duration_seconds
FROM departments d
LEFT JOIN files f ON f.current_department_id = d.id
LEFT JOIN timers t ON t.department_id = d.id AND t.end_time IS NOT NULL
WHERE d.is_virtual = false
GROUP BY d.id, d.name, d.code;

-- View: Designer performance
CREATE OR REPLACE VIEW v_designer_performance AS
SELECT 
  u.id AS user_id,
  u.full_name,
  u.username,
  COUNT(DISTINCT f.id) FILTER (WHERE f.status = 'SENT_TO_PRODUCTION') AS completed_files,
  COUNT(DISTINCT f.id) FILTER (WHERE f.status != 'SENT_TO_PRODUCTION') AS active_files,
  AVG(t.duration_seconds) FILTER (WHERE t.duration_seconds IS NOT NULL AND t.department_id = u.department_id) AS avg_repro_time,
  COUNT(DISTINCT al.id) FILTER (WHERE al.action_type IN ('CUSTOMER_NOK', 'QUALITY_NOK')) AS revision_count,
  COUNT(DISTINCT al.id) FILTER (WHERE al.action_type = 'RESTART_MG') AS mg_restart_count
FROM users u
LEFT JOIN files f ON f.assigned_designer_id = u.id
LEFT JOIN timers t ON t.user_id = u.id
LEFT JOIN audit_logs al ON al.file_id = f.id AND al.action_type IN ('CUSTOMER_NOK', 'QUALITY_NOK', 'RESTART_MG')
WHERE u.role = 'GRAFIKER'
GROUP BY u.id, u.full_name, u.username;
```

---

## 6. Database Backup Strategy

```bash
#!/bin/bash
# backup.sh - Daily backup script

BACKUP_DIR="/backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="repro_tracking"

# Create backup
pg_dump -Fc $DB_NAME > "$BACKUP_DIR/backup_$DATE.dump"

# Keep last 30 days
find $BACKUP_DIR -name "backup_*.dump" -mtime +30 -delete

# Optional: Upload to S3 or other storage
# aws s3 cp "$BACKUP_DIR/backup_$DATE.dump" "s3://bucket/backups/"
```
