# Implementation Plan
# Repro Department File Tracking System

**Version:** 1.0  
**Date:** February 2, 2026

---

## 1. Overview

This document outlines the implementation plan for building the RDFTS from scratch using the specified technology stack. The plan is divided into milestones with specific tasks and deliverables.

---

## 2. Technology Stack Summary

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL 15 |
| ORM | Prisma 5 |
| Authentication | NextAuth.js (Auth.js) v5 |
| Styling | Tailwind CSS + shadcn/ui |
| Validation | Zod |
| Charts | Recharts |
| Testing | Vitest + Playwright |
| Containerization | Docker + Docker Compose |

---

## 3. Milestones Overview

| # | Milestone | Duration | Dependencies |
|---|-----------|----------|--------------|
| M1 | Project Setup & Infrastructure | 3 days | None |
| M2 | Database & ORM Setup | 2 days | M1 |
| M3 | Authentication & RBAC | 3 days | M2 |
| M4 | Core File Management | 4 days | M3 |
| M5 | Timer & Takeover System | 3 days | M4 |
| M6 | Workflow Actions (R100/R200) | 4 days | M5 |
| M7 | Location Tracking | 2 days | M4 |
| M8 | Frontend - Core Pages | 5 days | M6 |
| M9 | Frontend - Dashboard & Reports | 4 days | M8 |
| M10 | Testing & Polish | 4 days | M9 |
| M11 | Deployment Preparation | 2 days | M10 |

**Total Estimated Duration: 36 days (~7 weeks)**

---

## 4. Detailed Task Breakdown

### Milestone 1: Project Setup & Infrastructure (3 days)

#### Task 1.1: Initialize Next.js Project
```bash
npx create-next-app@latest repro-tracking --typescript --tailwind --eslint --app
```

**Subtasks:**
- [ ] Create Next.js project with App Router
- [ ] Configure TypeScript strict mode
- [ ] Setup path aliases (@/components, @/lib, etc.)
- [ ] Configure ESLint + Prettier

**Deliverables:**
- Working Next.js application scaffold
- Configured tsconfig.json and eslint.config.js

#### Task 1.2: Setup Docker Environment
**Subtasks:**
- [ ] Create Dockerfile for Next.js app
- [ ] Create docker-compose.yml with:
  - PostgreSQL 15 container
  - Next.js app container
  - Volume for database persistence
- [ ] Create .env.example with required variables
- [ ] Add docker-compose commands to package.json scripts

**Deliverables:**
- docker-compose.yml
- Dockerfile
- .env.example

#### Task 1.3: Install & Configure UI Dependencies
```bash
npm install @radix-ui/react-* lucide-react class-variance-authority clsx tailwind-merge
npx shadcn-ui@latest init
```

**Subtasks:**
- [ ] Initialize shadcn/ui with default theme
- [ ] Install required shadcn components:
  - Button, Input, Card, Dialog, Dropdown
  - Table, Tabs, Badge, Alert
  - Select, Checkbox, Form, Label
  - Toast, Tooltip, Avatar
- [ ] Configure custom color theme (primary, status colors)
- [ ] Create utility functions (cn, formatters)

**Deliverables:**
- Configured tailwind.config.js
- components/ui/* directory with shadcn components

---

### Milestone 2: Database & ORM Setup (2 days)

#### Task 2.1: Initialize Prisma
```bash
npm install prisma @prisma/client
npx prisma init
```

**Subtasks:**
- [ ] Configure DATABASE_URL in .env
- [ ] Create complete schema.prisma with all models
- [ ] Define enums (Role, FileStatus, ActionType, etc.)
- [ ] Add all relations and indexes
- [ ] Create Prisma client singleton (lib/db/prisma.ts)

**Deliverables:**
- Complete prisma/schema.prisma
- lib/db/prisma.ts

#### Task 2.2: Create Migrations & Seed Data
**Subtasks:**
- [ ] Run initial migration: `npx prisma migrate dev`
- [ ] Create seed script (prisma/seed.ts)
- [ ] Implement seed data:
  - Departments (5 + virtual)
  - SLA targets
  - Users (8+ with different roles)
  - Location slots (30+)
  - Sample files (5-10 in various states)
- [ ] Configure seed command in package.json
- [ ] Test full database setup

**Deliverables:**
- prisma/migrations/* 
- prisma/seed.ts
- Working database with seed data

---

### Milestone 3: Authentication & RBAC (3 days)

#### Task 3.1: Configure NextAuth.js
```bash
npm install next-auth@beta @auth/prisma-adapter bcrypt
npm install -D @types/bcrypt
```

**Subtasks:**
- [ ] Create auth configuration (lib/auth/auth.config.ts)
- [ ] Configure Credentials provider
- [ ] Setup Prisma adapter (optional for session storage)
- [ ] Configure session strategy (JWT)
- [ ] Define session/token types with user role
- [ ] Create auth API routes (app/api/auth/[...nextauth])
- [ ] Create auth utility functions (getServerSession wrapper)

**Deliverables:**
- lib/auth/auth.config.ts
- lib/auth/auth.ts (session helpers)
- app/api/auth/[...nextauth]/route.ts

#### Task 3.2: Implement RBAC System
**Subtasks:**
- [ ] Define Permission type and ROLE_PERMISSIONS map
- [ ] Create hasPermission utility
- [ ] Create requirePermission middleware for API routes
- [ ] Create withAuth HOC/middleware for protected pages
- [ ] Implement getAuthorizedActions for file-specific permissions
- [ ] Add role to session type declarations

**Deliverables:**
- lib/auth/rbac.ts
- lib/auth/permissions.ts
- middleware.ts (route protection)

#### Task 3.3: Create Login Page & Auth Flow
**Subtasks:**
- [ ] Create login page (app/(auth)/login/page.tsx)
- [ ] Implement login form with validation
- [ ] Handle authentication errors
- [ ] Implement redirect after login (role-based)
- [ ] Create logout functionality
- [ ] Add session provider to root layout

**Deliverables:**
- app/(auth)/login/page.tsx
- Login form component
- Auth context/provider setup

---

### Milestone 4: Core File Management (4 days)

#### Task 4.1: Create File Service Layer
**Subtasks:**
- [ ] Create file service (lib/services/file.service.ts)
- [ ] Implement CRUD operations:
  - createFile
  - getFile (with relations)
  - getFiles (with filters, pagination)
  - updateFile
  - searchByFileNo
- [ ] Implement getFileWithTimeline
- [ ] Add Zod schemas for file operations
- [ ] Write unit tests for file service

**Deliverables:**
- lib/services/file.service.ts
- lib/validations/file.schema.ts
- tests/services/file.service.test.ts

#### Task 4.2: Create File API Routes
**Subtasks:**
- [ ] GET /api/files - List with filters
- [ ] POST /api/files - Create new file
- [ ] GET /api/files/[id] - Get single file
- [ ] PATCH /api/files/[id] - Update file
- [ ] GET /api/files/[id]/timeline - Get timeline
- [ ] GET /api/files/search - Search by file_no
- [ ] Add authorization checks to all routes
- [ ] Handle errors consistently

**Deliverables:**
- app/api/files/route.ts
- app/api/files/[id]/route.ts
- app/api/files/[id]/timeline/route.ts
- app/api/files/search/route.ts

#### Task 4.3: Create Audit Logging Service
**Subtasks:**
- [ ] Create audit service (lib/services/audit.service.ts)
- [ ] Implement createAuditLog function
- [ ] Define action type handlers
- [ ] Integrate with file operations
- [ ] Create getAuditLogs query function

**Deliverables:**
- lib/services/audit.service.ts

#### Task 4.4: Create Notes Service & API
**Subtasks:**
- [ ] Create notes service (lib/services/note.service.ts)
- [ ] GET /api/files/[id]/notes - Get file notes
- [ ] POST /api/files/[id]/notes - Add note
- [ ] Validate note input with Zod

**Deliverables:**
- lib/services/note.service.ts
- app/api/files/[id]/notes/route.ts

---

### Milestone 5: Timer & Takeover System (3 days)

#### Task 5.1: Create Timer Service
**Subtasks:**
- [ ] Create timer service (lib/services/timer.service.ts)
- [ ] Implement startTimer with transaction
- [ ] Implement stopTimer with duration calculation
- [ ] Implement getActiveTimer
- [ ] Implement getFileTimers
- [ ] Add optimistic locking to prevent race conditions
- [ ] Handle CustomerApproval (null user) timers
- [ ] Write unit tests

**Deliverables:**
- lib/services/timer.service.ts
- tests/services/timer.service.test.ts

#### Task 5.2: Create Takeover (Devral) API
**Subtasks:**
- [ ] POST /api/files/[id]/takeover - Devral action
- [ ] Validate user can take over (department match, status)
- [ ] Stop previous timer (if any)
- [ ] Start new timer
- [ ] Update file status based on department
- [ ] Create audit log
- [ ] Handle location update

**Deliverables:**
- app/api/files/[id]/takeover/route.ts

#### Task 5.3: Create Transfer API
**Subtasks:**
- [ ] POST /api/files/[id]/transfer - Transfer action
- [ ] Validate transfer is allowed (state machine)
- [ ] Stop current timer
- [ ] Set pendingTakeover=true
- [ ] Update currentDepartment
- [ ] Update status
- [ ] Create audit log

**Deliverables:**
- app/api/files/[id]/transfer/route.ts

---

### Milestone 6: Workflow Actions - R100/R200 (4 days)

#### Task 6.1: Create Workflow Service
**Subtasks:**
- [ ] Create workflow service (lib/services/workflow.service.ts)
- [ ] Define state transition map
- [ ] Implement validateTransition
- [ ] Implement getAvailableActions for file+user

**Deliverables:**
- lib/services/workflow.service.ts

#### Task 6.2: Implement Assignment Action
**Subtasks:**
- [ ] POST /api/files/[id]/assign
- [ ] Validate: file is AWAITING_ASSIGNMENT
- [ ] Validate: user is ADMIN
- [ ] Set assignedDesignerId
- [ ] Update status to ASSIGNED
- [ ] Create audit log

**Deliverables:**
- app/api/files/[id]/assign/route.ts

#### Task 6.3: Implement R100 Approval Actions
**Subtasks:**
- [ ] POST /api/files/[id]/request-approval
  - Grafiker sends to Önrepro
- [ ] POST /api/files/[id]/send-to-customer
  - Önrepro sends to customer (virtual dept)
- [ ] POST /api/files/[id]/customer-ok
  - Customer approved → Quality
- [ ] POST /api/files/[id]/customer-nok
  - Customer rejected → same Grafiker
  - Require note
- [ ] POST /api/files/[id]/restart-mg
  - MG2/MG3 restart
  - Increment iteration
  - Require note

**Deliverables:**
- app/api/files/[id]/actions/route.ts (grouped)
- Or individual route files

#### Task 6.4: Implement R200 Quality & Production Actions
**Subtasks:**
- [ ] POST /api/files/[id]/quality-ok
  - Quality approved → Kolaj
- [ ] POST /api/files/[id]/quality-nok
  - Quality rejected → same Grafiker
  - Require note
- [ ] POST /api/files/[id]/direct-to-quality
  - For no-approval files
- [ ] POST /api/files/[id]/send-to-production
  - Terminal action
  - Set closedAt

**Deliverables:**
- Complete workflow action endpoints

#### Task 6.5: Implement Manager Override
**Subtasks:**
- [ ] POST /api/files/[id]/override
- [ ] Support actions: REASSIGN, FORCE_STATUS, CANCEL
- [ ] Require detailed reason (20+ chars)
- [ ] Create detailed audit log
- [ ] Admin only

**Deliverables:**
- app/api/files/[id]/override/route.ts

---

### Milestone 7: Location Tracking (2 days)

#### Task 7.1: Create Location Service & API
**Subtasks:**
- [ ] Create location service (lib/services/location.service.ts)
- [ ] GET /api/locations - List all slots with occupancy
- [ ] POST /api/locations - Create slot (admin)
- [ ] PATCH /api/locations/[id] - Update slot
- [ ] Implement getLocationMap - grouped by area

**Deliverables:**
- lib/services/location.service.ts
- app/api/locations/route.ts
- app/api/locations/[id]/route.ts

#### Task 7.2: Integrate Location with File Operations
**Subtasks:**
- [ ] Update file operations to handle location
- [ ] Validate location slot exists
- [ ] Track location changes in transfers
- [ ] Clear location on send-to-production

**Deliverables:**
- Updated file service with location handling

---

### Milestone 8: Frontend - Core Pages (5 days)

#### Task 8.1: Create Layout Components
**Subtasks:**
- [ ] Create main layout (app/(dashboard)/layout.tsx)
- [ ] Create Sidebar component with role-based nav
- [ ] Create Header with search and user menu
- [ ] Create responsive mobile navigation
- [ ] Implement breadcrumbs

**Deliverables:**
- components/layout/Sidebar.tsx
- components/layout/Header.tsx
- components/layout/Navigation.tsx
- app/(dashboard)/layout.tsx

#### Task 8.2: Create File List & Search Page
**Subtasks:**
- [ ] Create files page (app/(dashboard)/files/page.tsx)
- [ ] Implement FileList component with DataTable
- [ ] Add filters (status, department, priority)
- [ ] Add search functionality
- [ ] Implement pagination
- [ ] Add loading and empty states

**Deliverables:**
- app/(dashboard)/files/page.tsx
- components/files/FileList.tsx
- components/files/FileFilters.tsx

#### Task 8.3: Create File Detail Page
**Subtasks:**
- [ ] Create file detail page (app/(dashboard)/files/[id]/page.tsx)
- [ ] Create FileHeader component (status, owner, dept)
- [ ] Create LocationMap component with grid
- [ ] Create FileTimeline component
- [ ] Create NotesList component with add form
- [ ] Create FileActions component (context-aware buttons)
- [ ] Implement tab navigation (Timeline, Notes, KSM, History)

**Deliverables:**
- app/(dashboard)/files/[id]/page.tsx
- components/files/FileHeader.tsx
- components/files/FileTimeline.tsx
- components/files/FileActions.tsx
- components/location/LocationMap.tsx
- components/notes/NotesList.tsx
- components/notes/NoteForm.tsx

#### Task 8.4: Create File Create Form
**Subtasks:**
- [ ] Create new file page (app/(dashboard)/files/new/page.tsx)
- [ ] Create FileForm component with validation
- [ ] Implement KSM data fields (flexible JSON)
- [ ] Implement color tag input
- [ ] Create location selector
- [ ] Handle form submission
- [ ] Add success/error feedback

**Deliverables:**
- app/(dashboard)/files/new/page.tsx
- components/files/FileForm.tsx

#### Task 8.5: Create Department Queue Page
**Subtasks:**
- [ ] Create queue page (app/(dashboard)/queue/page.tsx)
- [ ] Show "My active files" section
- [ ] Show "Pending takeover" section
- [ ] Display timer for active files
- [ ] Quick action buttons on cards
- [ ] SLA status indicators

**Deliverables:**
- app/(dashboard)/queue/page.tsx
- components/queue/ActiveFileCard.tsx
- components/queue/PendingTakeoverCard.tsx

---

### Milestone 9: Frontend - Dashboard & Reports (4 days)

#### Task 9.1: Create Manager Dashboard
**Subtasks:**
- [ ] Create dashboard page (app/(dashboard)/page.tsx)
- [ ] Create StatsCard component
- [ ] Create WorkloadChart (horizontal bar)
- [ ] Create BottleneckAlert list
- [ ] Create DepartmentStats component
- [ ] Implement role-based dashboard routing

**Deliverables:**
- app/(dashboard)/page.tsx
- components/dashboard/StatsCard.tsx
- components/dashboard/WorkloadChart.tsx
- components/dashboard/BottleneckAlert.tsx

#### Task 9.2: Create Assignment Pool Page
**Subtasks:**
- [ ] Create assignments page (app/(dashboard)/assignments/page.tsx)
- [ ] Create AssignmentPool component
- [ ] Implement multi-select for files
- [ ] Create AssignmentModal with designer selector
- [ ] Show designer workload in modal
- [ ] Handle bulk assignment

**Deliverables:**
- app/(dashboard)/assignments/page.tsx
- components/assignments/AssignmentPool.tsx
- components/assignments/AssignmentModal.tsx

#### Task 9.3: Create Reports Pages
**Subtasks:**
- [ ] Create reports page (app/(dashboard)/reports/page.tsx)
- [ ] Implement date range filter
- [ ] Create ThroughputChart (line chart)
- [ ] Create DesignerPerformanceTable
- [ ] Create DepartmentTimesTable
- [ ] Install and configure Recharts
- [ ] Create report API endpoints

**Deliverables:**
- app/(dashboard)/reports/page.tsx
- app/api/reports/performance/route.ts
- app/api/reports/throughput/route.ts
- app/api/reports/bottlenecks/route.ts
- components/reports/ThroughputChart.tsx
- components/reports/DesignerPerformance.tsx

#### Task 9.4: Create Admin Settings Pages
**Subtasks:**
- [ ] Create admin layout (app/(dashboard)/admin/layout.tsx)
- [ ] Create users page (app/(dashboard)/admin/users/page.tsx)
- [ ] Create UserForm modal (create/edit)
- [ ] Create settings page (SLA, locations)
- [ ] Create audit log viewer
- [ ] Implement user activation/deactivation

**Deliverables:**
- app/(dashboard)/admin/users/page.tsx
- app/(dashboard)/admin/settings/page.tsx
- components/admin/UserForm.tsx
- components/admin/AuditLogViewer.tsx

---

### Milestone 10: Testing & Polish (4 days)

#### Task 10.1: Unit Tests
**Subtasks:**
- [ ] Setup Vitest configuration
- [ ] Write tests for file.service.ts
- [ ] Write tests for timer.service.ts
- [ ] Write tests for workflow.service.ts
- [ ] Write tests for RBAC utilities
- [ ] Achieve 80% coverage on services

**Deliverables:**
- vitest.config.ts
- tests/unit/* test files
- Coverage report

#### Task 10.2: Integration Tests
**Subtasks:**
- [ ] Setup test database
- [ ] Write API integration tests
- [ ] Test authentication flow
- [ ] Test file lifecycle
- [ ] Test timer operations
- [ ] Test workflow transitions

**Deliverables:**
- tests/integration/* test files

#### Task 10.3: E2E Tests with Playwright
**Subtasks:**
- [ ] Setup Playwright configuration
- [ ] Write login flow test
- [ ] Write file creation test
- [ ] Write assignment flow test
- [ ] Write takeover/transfer test
- [ ] Write complete R100 workflow test

**Deliverables:**
- playwright.config.ts
- tests/e2e/* test files

#### Task 10.4: UI Polish & Bug Fixes
**Subtasks:**
- [ ] Review all pages for consistency
- [ ] Fix responsive issues
- [ ] Add loading states everywhere
- [ ] Add error boundaries
- [ ] Implement toast notifications
- [ ] Add keyboard shortcuts
- [ ] Review accessibility
- [ ] Fix any reported bugs

**Deliverables:**
- Polished, consistent UI
- Bug-free application

---

### Milestone 11: Deployment Preparation (2 days)

#### Task 11.1: Production Configuration
**Subtasks:**
- [ ] Create production Dockerfile
- [ ] Create production docker-compose.yml
- [ ] Configure environment variables
- [ ] Setup database backup script
- [ ] Configure logging
- [ ] Create health check endpoint

**Deliverables:**
- Dockerfile.prod
- docker-compose.prod.yml
- Deployment documentation

#### Task 11.2: Documentation
**Subtasks:**
- [ ] Write README.md with setup instructions
- [ ] Document environment variables
- [ ] Create user guide (basic)
- [ ] Document backup/restore procedures
- [ ] Create troubleshooting guide

**Deliverables:**
- Updated README.md
- docs/USER_GUIDE.md
- docs/DEPLOYMENT.md

---

## 5. Risk Management

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Timer race conditions | High | Medium | Use database transactions with serializable isolation |
| Complex state machine bugs | High | Medium | Extensive testing, state diagram documentation |
| Performance with many files | Medium | Low | Add database indexes, implement pagination |
| Authentication issues | High | Low | Use established NextAuth patterns |
| UI/UX complaints | Medium | Medium | Iterative feedback, user testing |

---

## 6. Definition of Done

A task is considered "done" when:
1. Code is written and compiles without errors
2. Code follows project coding standards
3. Unit tests pass (where applicable)
4. Code is reviewed (self-review for solo dev)
5. Feature works as specified
6. No console errors in browser
7. Works on desktop and tablet viewports
8. Documentation is updated (if needed)

---

## 7. Daily Schedule Template

```
09:00 - 09:15  Review yesterday, plan today
09:15 - 12:00  Development (focused work)
12:00 - 13:00  Lunch break
13:00 - 15:00  Development (focused work)
15:00 - 15:15  Break
15:15 - 17:00  Development + testing
17:00 - 17:30  Code review, commit, documentation
```

---

## 8. MVP Checklist

Before MVP is considered complete:

- [ ] Users can log in with their credentials
- [ ] Önrepro can create new file records
- [ ] Manager can see unassigned pool
- [ ] Manager can assign files to designers
- [ ] Files stay with assigned designer through all loops
- [ ] Users can do Devral (takeover)
- [ ] Timers start/stop correctly
- [ ] Only one active timer per file
- [ ] Full R100 approval loop works
- [ ] Full R200 quality loop works
- [ ] Files can be sent to production (terminal)
- [ ] File search shows location and timeline
- [ ] Notes can be added
- [ ] NOK actions require notes
- [ ] Basic dashboard with stats
- [ ] Reports show throughput and times
- [ ] All audit logs are recorded
- [ ] System runs in Docker
