# API Design Specification
# Repro Department File Tracking System

**Version:** 1.0  
**Date:** February 2, 2026  
**Base URL:** `/api`

---

## 1. API Overview

### 1.1 Design Principles
- RESTful endpoints with resource-based URLs
- JSON request/response bodies
- JWT-based authentication via NextAuth
- Role-based authorization on all endpoints
- Zod validation for all inputs
- Consistent error response format

### 1.2 Authentication
All API endpoints (except `/api/auth/*`) require authentication via session cookie managed by NextAuth.

```typescript
// Request header (automatic with NextAuth)
Cookie: next-auth.session-token=<session_token>
```

### 1.3 Common Response Format

**Success Response:**
```typescript
{
  "success": true,
  "data": T,
  "meta"?: {
    "pagination"?: {
      "page": number,
      "limit": number,
      "total": number,
      "totalPages": number
    }
  }
}
```

**Error Response:**
```typescript
{
  "success": false,
  "error": {
    "code": string,      // e.g., "VALIDATION_ERROR", "NOT_FOUND"
    "message": string,   // Human-readable message
    "details"?: {        // Field-specific errors (for validation)
      [field: string]: string[]
    }
  }
}
```

---

## 2. Authentication Endpoints

### 2.1 Login
NextAuth handles authentication. Configure credentials provider.

```
POST /api/auth/callback/credentials
Content-Type: application/json

{
  "username": "bahar",
  "password": "password123"
}
```

**Response:** Redirect with session cookie set

### 2.2 Get Session
```
GET /api/auth/session
```

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "username": "bahar",
    "fullName": "Bahar Hanım",
    "role": "ADMIN",
    "departmentId": "uuid",
    "departmentCode": "ADMIN"
  },
  "expires": "2026-02-03T12:00:00.000Z"
}
```

### 2.3 Logout
```
POST /api/auth/signout
```

---

## 3. File Endpoints

### 3.1 List Files
```
GET /api/files
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 20, max: 100) |
| status | string | Filter by status (comma-separated) |
| departmentId | uuid | Filter by current department |
| assignedDesignerId | uuid | Filter by assigned designer |
| search | string | Search by file_no or customer_name |
| pendingTakeover | boolean | Filter pending takeover files |
| priority | string | Filter by priority |
| sortBy | string | Sort field (default: createdAt) |
| sortOrder | string | asc or desc (default: desc) |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "fileNo": "REP-2026-0001",
      "customerName": "ABC Ambalaj A.Ş.",
      "customerNo": "CUST-001",
      "status": "IN_REPRO",
      "priority": "HIGH",
      "assignedDesigner": {
        "id": "uuid",
        "fullName": "Ali Demir"
      },
      "currentDepartment": {
        "id": "uuid",
        "name": "Repro",
        "code": "REPRO"
      },
      "currentLocation": {
        "id": "uuid",
        "code": "R1",
        "name": "Repro Masası 1"
      },
      "iterationLabel": "MG1",
      "pendingTakeover": false,
      "createdAt": "2026-02-01T10:00:00.000Z",
      "updatedAt": "2026-02-02T08:30:00.000Z"
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    }
  }
}
```

### 3.2 Get Single File
```
GET /api/files/:id
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "fileNo": "REP-2026-0001",
    "customerName": "ABC Ambalaj A.Ş.",
    "customerNo": "CUST-001",
    "ksmData": {
      "width": 1200,
      "height": 800,
      "colors": ["Cyan", "Magenta", "Yellow", "Black"],
      "cylinder": "C-120"
    },
    "status": "IN_REPRO",
    "priority": "HIGH",
    "assignedDesigner": {
      "id": "uuid",
      "fullName": "Ali Demir",
      "username": "grafiker1"
    },
    "currentDepartment": {
      "id": "uuid",
      "name": "Repro",
      "code": "REPRO"
    },
    "currentLocation": {
      "id": "uuid",
      "code": "R1",
      "name": "Repro Masası 1",
      "area": "REPRO",
      "row": 1,
      "column": 1
    },
    "iterationNumber": 1,
    "iterationLabel": "MG1",
    "pendingTakeover": false,
    "requiresApproval": true,
    "activeTimer": {
      "id": "uuid",
      "departmentId": "uuid",
      "userId": "uuid",
      "startTime": "2026-02-02T08:30:00.000Z",
      "elapsedSeconds": 7200
    },
    "createdAt": "2026-02-01T10:00:00.000Z",
    "updatedAt": "2026-02-02T08:30:00.000Z",
    "closedAt": null
  }
}
```

### 3.3 Get File Timeline
```
GET /api/files/:id/timeline
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "uuid",
        "actionType": "CREATE",
        "fromDepartment": null,
        "toDepartment": {
          "id": "uuid",
          "name": "Ön Repro",
          "code": "ONREPRO"
        },
        "byUser": {
          "id": "uuid",
          "fullName": "Mehmet Yılmaz"
        },
        "payload": { "initial": true },
        "timestamp": "2026-02-01T10:00:00.000Z"
      },
      {
        "id": "uuid",
        "actionType": "ASSIGN",
        "fromDepartment": null,
        "toDepartment": {
          "id": "uuid",
          "name": "Repro",
          "code": "REPRO"
        },
        "byUser": {
          "id": "uuid",
          "fullName": "Bahar Hanım"
        },
        "payload": { "assignedTo": "Ali Demir" },
        "timestamp": "2026-02-01T12:00:00.000Z"
      },
      {
        "id": "uuid",
        "actionType": "TAKEOVER",
        "fromDepartment": {
          "id": "uuid",
          "name": "Ön Repro",
          "code": "ONREPRO"
        },
        "toDepartment": {
          "id": "uuid",
          "name": "Repro",
          "code": "REPRO"
        },
        "byUser": {
          "id": "uuid",
          "fullName": "Ali Demir"
        },
        "timestamp": "2026-02-02T08:30:00.000Z"
      }
    ],
    "timers": [
      {
        "id": "uuid",
        "department": {
          "id": "uuid",
          "name": "Ön Repro",
          "code": "ONREPRO"
        },
        "user": {
          "id": "uuid",
          "fullName": "Mehmet Yılmaz"
        },
        "startTime": "2026-02-01T10:00:00.000Z",
        "endTime": "2026-02-02T08:30:00.000Z",
        "durationSeconds": 81000
      },
      {
        "id": "uuid",
        "department": {
          "id": "uuid",
          "name": "Repro",
          "code": "REPRO"
        },
        "user": {
          "id": "uuid",
          "fullName": "Ali Demir"
        },
        "startTime": "2026-02-02T08:30:00.000Z",
        "endTime": null,
        "durationSeconds": null
      }
    ]
  }
}
```

### 3.4 Create File
**Authorization:** ADMIN, ONREPRO only

```
POST /api/files
Content-Type: application/json

{
  "fileNo": "REP-2026-0010",
  "customerName": "Yeni Müşteri A.Ş.",
  "customerNo": "CUST-010",
  "ksmData": {
    "width": 1200,
    "height": 800,
    "colors": ["Cyan", "Magenta", "Yellow", "Black"],
    "cylinder": "C-120",
    "notes": "Özel renk gereksinimi var"
  },
  "locationSlotId": "uuid",
  "requiresApproval": true,
  "priority": "NORMAL"
}
```

**Validation Rules:**
- fileNo: Required, unique, 1-50 chars
- customerName: Required, 1-200 chars
- customerNo: Optional, max 50 chars
- ksmData: Optional JSON object
- locationSlotId: Required, must exist
- requiresApproval: Optional, default true
- priority: Optional, enum (LOW, NORMAL, HIGH, URGENT)

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440010",
    "fileNo": "REP-2026-0010",
    "customerName": "Yeni Müşteri A.Ş.",
    "status": "AWAITING_ASSIGNMENT",
    "createdAt": "2026-02-02T10:00:00.000Z"
  }
}
```

### 3.5 Update File
**Authorization:** ADMIN, ONREPRO, or assigned designer

```
PATCH /api/files/:id
Content-Type: application/json

{
  "customerName": "Updated Name",
  "ksmData": { ... },
  "priority": "HIGH",
  "locationSlotId": "uuid"
}
```

**Note:** Cannot update fileNo, status (use actions), assignedDesignerId (use assign)

**Response (200):**
```json
{
  "success": true,
  "data": { ... }
}
```

### 3.6 Search File by Number
```
GET /api/files/search?fileNo=REP-2026-0001
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "file": { ... },
    "timeline": { ... },
    "notes": [ ... ]
  }
}
```

---

## 4. File Actions Endpoints

### 4.1 Assign Designer
**Authorization:** ADMIN only

```
POST /api/files/:id/assign
Content-Type: application/json

{
  "designerId": "uuid",
  "note": "Acil iş, öncelikli olarak ele alınmalı"
}
```

**Business Rules:**
- File must be in AWAITING_ASSIGNMENT status
- Designer must have GRAFIKER role and be active
- Creates audit log entry

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "ASSIGNED",
    "assignedDesigner": {
      "id": "uuid",
      "fullName": "Ali Demir"
    }
  }
}
```

### 4.2 Takeover (Devral)
**Authorization:** User's department must match file's current department

```
POST /api/files/:id/takeover
Content-Type: application/json

{
  "locationSlotId": "uuid",
  "note": "Dosyayı aldım, çalışmaya başlıyorum"
}
```

**Business Rules:**
- File must have pendingTakeover=true OR be in ASSIGNED/REVISION_REQUIRED status for designer
- Stops any existing active timer for this file
- Starts new timer for user's department
- Updates file status based on department
- Creates audit log entry

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "IN_REPRO",
    "pendingTakeover": false,
    "activeTimer": {
      "id": "uuid",
      "startTime": "2026-02-02T10:00:00.000Z"
    }
  }
}
```

### 4.3 Transfer
**Authorization:** User must have active timer on this file

```
POST /api/files/:id/transfer
Content-Type: application/json

{
  "toDepartmentId": "uuid",
  "locationSlotId": "uuid",
  "note": "Tasarım tamamlandı, kalite kontrole gönderiliyor"
}
```

**Business Rules:**
- User must be in current department of file
- Validates department transition is allowed
- Stops current timer
- Sets pendingTakeover=true
- Updates status based on target department
- Creates audit log entry

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "IN_QUALITY",
    "pendingTakeover": true,
    "currentDepartment": {
      "id": "uuid",
      "name": "Kalite"
    }
  }
}
```

### 4.4 Request Approval (Grafiker)
**Authorization:** Assigned designer only

```
POST /api/files/:id/request-approval
Content-Type: application/json

{
  "note": "Tasarım tamamlandı, müşteri onayına hazır"
}
```

**Business Rules:**
- File must be IN_REPRO
- requiresApproval must be true
- Transfers to ONREPRO for APPROVAL_PREP

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "APPROVAL_PREP"
  }
}
```

### 4.5 Send to Customer Approval
**Authorization:** ADMIN, ONREPRO only

```
POST /api/files/:id/send-to-customer
Content-Type: application/json

{
  "note": "GMG proof müşteriye gönderildi"
}
```

**Business Rules:**
- File must be in APPROVAL_PREP
- Starts timer on CUSTOMER virtual department
- Updates status to CUSTOMER_APPROVAL

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "CUSTOMER_APPROVAL"
  }
}
```

### 4.6 Customer OK
**Authorization:** ADMIN, ONREPRO only

```
POST /api/files/:id/customer-ok
Content-Type: application/json

{
  "note": "Müşteri onayladı"
}
```

**Business Rules:**
- File must be in CUSTOMER_APPROVAL
- Stops customer timer
- Transfers to Quality (IN_QUALITY status, pending takeover)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "IN_QUALITY",
    "pendingTakeover": true
  }
}
```

### 4.7 Customer NOK
**Authorization:** ADMIN, ONREPRO only

```
POST /api/files/:id/customer-nok
Content-Type: application/json

{
  "note": "Müşteri red etti: Renk tonları uygun değil, daha canlı olmalı"
}
```

**Validation:**
- note: Required, minimum 10 characters

**Business Rules:**
- File must be in CUSTOMER_APPROVAL
- Stops customer timer
- Sets status to REVISION_REQUIRED
- File goes back to same assigned designer (not reassigned!)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "REVISION_REQUIRED",
    "assignedDesigner": {
      "id": "uuid",
      "fullName": "Ali Demir"
    }
  }
}
```

### 4.8 Restart from Önrepro (MG2/MG3)
**Authorization:** ADMIN, ONREPRO only

```
POST /api/files/:id/restart-mg
Content-Type: application/json

{
  "note": "Müşteri yeni veri seti gönderdi (MG2)"
}
```

**Validation:**
- note: Required

**Business Rules:**
- File must be in CUSTOMER_APPROVAL
- Increments iteration (iterationNumber++)
- Updates iterationLabel (MG1 → MG2 → MG3...)
- Stops customer timer
- Sets status to APPROVAL_PREP (back to Önrepro)
- Same assigned designer stays

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "APPROVAL_PREP",
    "iterationNumber": 2,
    "iterationLabel": "MG2"
  }
}
```

### 4.9 Quality OK
**Authorization:** ADMIN, KALITE only

```
POST /api/files/:id/quality-ok
Content-Type: application/json

{
  "note": "Kalite kontrol geçti"
}
```

**Business Rules:**
- File must be in IN_QUALITY
- User must have active timer (completed takeover)
- Stops timer
- Transfers to Kolaj (IN_KOLAJ, pending takeover)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "IN_KOLAJ",
    "pendingTakeover": true
  }
}
```

### 4.10 Quality NOK
**Authorization:** ADMIN, KALITE only

```
POST /api/files/:id/quality-nok
Content-Type: application/json

{
  "note": "Baskı hizalama hatası tespit edildi, düzeltilmeli"
}
```

**Validation:**
- note: Required, minimum 10 characters

**Business Rules:**
- File must be in IN_QUALITY
- Stops timer
- Sets status to REVISION_REQUIRED
- File goes back to same assigned designer

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "REVISION_REQUIRED"
  }
}
```

### 4.11 Send to Production
**Authorization:** ADMIN, KOLAJ only

```
POST /api/files/:id/send-to-production
Content-Type: application/json

{
  "note": "Üretime gönderildi"
}
```

**Business Rules:**
- File must be in IN_KOLAJ
- User must have active timer
- Stops timer
- Sets status to SENT_TO_PRODUCTION (terminal)
- Sets closedAt timestamp
- Clears location (file left the system)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "SENT_TO_PRODUCTION",
    "closedAt": "2026-02-02T16:00:00.000Z"
  }
}
```

### 4.12 Direct to Quality (No Approval)
**Authorization:** Assigned designer only

```
POST /api/files/:id/direct-to-quality
Content-Type: application/json

{
  "note": "Tekrar iş, onay gerektirmiyor"
}
```

**Business Rules:**
- File must be IN_REPRO
- requiresApproval must be false
- Stops designer timer
- Transfers to Quality (IN_QUALITY, pending takeover)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "IN_QUALITY",
    "pendingTakeover": true
  }
}
```

### 4.13 Manager Override
**Authorization:** ADMIN only

```
POST /api/files/:id/override
Content-Type: application/json

{
  "action": "REASSIGN",
  "newDesignerId": "uuid",
  "reason": "Tasarımcı uzun süreli izinde, iş aktarılıyor"
}
```

**Validation:**
- action: Required, one of: REASSIGN, FORCE_STATUS, CANCEL
- reason: Required, minimum 20 characters

**Business Rules:**
- Creates detailed audit log
- Marks as override action
- Rare, audited operation

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "overrideApplied": true
  }
}
```

---

## 5. Notes Endpoints

### 5.1 Get File Notes
```
GET /api/files/:id/notes
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "message": "Renk eşleştirmesi yapılıyor",
      "user": {
        "id": "uuid",
        "fullName": "Ali Demir"
      },
      "department": {
        "id": "uuid",
        "name": "Repro"
      },
      "isSystem": false,
      "createdAt": "2026-02-02T09:00:00.000Z"
    }
  ]
}
```

### 5.2 Add Note
```
POST /api/files/:id/notes
Content-Type: application/json

{
  "message": "Müşteri ile görüşme yapıldı, ek talepler not edildi"
}
```

**Validation:**
- message: Required, 1-5000 chars

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "message": "Müşteri ile görüşme yapıldı, ek talepler not edildi",
    "createdAt": "2026-02-02T10:00:00.000Z"
  }
}
```

---

## 6. User Management Endpoints

### 6.1 List Users
**Authorization:** ADMIN only

```
GET /api/users
```

**Query Parameters:**
- role: Filter by role
- departmentId: Filter by department
- isActive: Filter by active status

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "username": "grafiker1",
      "fullName": "Ali Demir",
      "email": "ali@company.com",
      "role": "GRAFIKER",
      "department": {
        "id": "uuid",
        "name": "Repro"
      },
      "isActive": true,
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

### 6.2 Get User
**Authorization:** ADMIN or self

```
GET /api/users/:id
```

### 6.3 Create User
**Authorization:** ADMIN only

```
POST /api/users
Content-Type: application/json

{
  "username": "newuser",
  "password": "securePassword123",
  "fullName": "Yeni Kullanıcı",
  "email": "newuser@company.com",
  "role": "GRAFIKER",
  "departmentId": "uuid"
}
```

**Validation:**
- username: Required, unique, 3-50 chars, alphanumeric + underscore
- password: Required, minimum 8 chars
- fullName: Required, 2-100 chars
- email: Optional, valid email format
- role: Required, valid enum value
- departmentId: Required, must exist

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "username": "newuser",
    "fullName": "Yeni Kullanıcı"
  }
}
```

### 6.4 Update User
**Authorization:** ADMIN only

```
PATCH /api/users/:id
Content-Type: application/json

{
  "fullName": "Updated Name",
  "email": "newemail@company.com",
  "role": "KALITE",
  "departmentId": "uuid"
}
```

### 6.5 Deactivate User
**Authorization:** ADMIN only

```
POST /api/users/:id/deactivate
```

**Business Rules:**
- Sets isActive=false
- Does not delete user (audit trail preservation)
- User can no longer log in

---

## 7. Dashboard & Reports Endpoints

### 7.1 Get Manager Dashboard
**Authorization:** ADMIN only

```
GET /api/dashboard/manager
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "unassignedCount": 5,
    "activeFilesCount": 23,
    "completedToday": 8,
    "overdueFiles": [
      {
        "id": "uuid",
        "fileNo": "REP-2026-0001",
        "customerName": "ABC",
        "currentDepartment": "REPRO",
        "elapsedHours": 52,
        "slaHours": 48,
        "slaStatus": "CRITICAL"
      }
    ],
    "workloadByDesigner": [
      {
        "userId": "uuid",
        "fullName": "Ali Demir",
        "activeFiles": 5,
        "avgProcessingHours": 18.5
      }
    ],
    "departmentStats": [
      {
        "departmentId": "uuid",
        "name": "Repro",
        "activeFiles": 8,
        "avgWaitHours": 4.2
      }
    ]
  }
}
```

### 7.2 Get Department Queue
```
GET /api/dashboard/queue
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "myActiveFiles": [
      {
        "id": "uuid",
        "fileNo": "REP-2026-0002",
        "customerName": "XYZ",
        "status": "IN_REPRO",
        "timerStartedAt": "2026-02-02T08:00:00.000Z",
        "elapsedMinutes": 180
      }
    ],
    "pendingTakeover": [
      {
        "id": "uuid",
        "fileNo": "REP-2026-0005",
        "customerName": "DEF",
        "transferredAt": "2026-02-02T09:00:00.000Z",
        "waitingMinutes": 60
      }
    ]
  }
}
```

### 7.3 Get Performance Report
**Authorization:** ADMIN only

```
GET /api/reports/performance
```

**Query Parameters:**
- startDate: ISO date string
- endDate: ISO date string
- designerId: Optional filter

**Response (200):**
```json
{
  "success": true,
  "data": {
    "period": {
      "start": "2026-01-01",
      "end": "2026-01-31"
    },
    "summary": {
      "totalCompleted": 145,
      "avgCycleTimeDays": 3.2,
      "revisionRate": 0.15
    },
    "byDesigner": [
      {
        "userId": "uuid",
        "fullName": "Ali Demir",
        "completedFiles": 45,
        "avgReproTimeHours": 16.5,
        "revisionCount": 5,
        "mgRestartCount": 2
      }
    ],
    "byDepartment": [
      {
        "departmentId": "uuid",
        "name": "Repro",
        "avgTimeHours": 18.2,
        "medianTimeHours": 14.5,
        "maxTimeHours": 72
      }
    ]
  }
}
```

### 7.4 Get Throughput Report
**Authorization:** ADMIN only

```
GET /api/reports/throughput
```

**Query Parameters:**
- period: daily | weekly | monthly
- startDate: ISO date string
- endDate: ISO date string

**Response (200):**
```json
{
  "success": true,
  "data": {
    "period": "daily",
    "data": [
      {
        "date": "2026-02-01",
        "created": 12,
        "completed": 8,
        "inProgress": 23
      },
      {
        "date": "2026-02-02",
        "created": 10,
        "completed": 11,
        "inProgress": 22
      }
    ]
  }
}
```

### 7.5 Get Bottleneck Report
**Authorization:** ADMIN only

```
GET /api/reports/bottlenecks
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "overdueByDepartment": {
      "REPRO": 3,
      "KALITE": 1,
      "CUSTOMER": 5
    },
    "longestWaiting": [
      {
        "id": "uuid",
        "fileNo": "REP-2026-0004",
        "customerName": "GHI",
        "department": "CUSTOMER",
        "waitingHours": 72
      }
    ],
    "congestionIndex": {
      "ONREPRO": 0.2,
      "REPRO": 0.7,
      "KALITE": 0.4,
      "KOLAJ": 0.3
    }
  }
}
```

---

## 8. Location Endpoints

### 8.1 List Location Slots
```
GET /api/locations
```

**Query Parameters:**
- area: Filter by area (WAITING, REPRO, QUALITY, KOLAJ)
- isActive: Filter by active status

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "code": "A1",
      "name": "Bekleme Alanı 1",
      "area": "WAITING",
      "row": 1,
      "column": 1,
      "isActive": true,
      "currentFile": null
    },
    {
      "id": "uuid",
      "code": "R1",
      "name": "Repro Masası 1",
      "area": "REPRO",
      "row": 1,
      "column": 1,
      "isActive": true,
      "currentFile": {
        "id": "uuid",
        "fileNo": "REP-2026-0002"
      }
    }
  ]
}
```

### 8.2 Create Location Slot
**Authorization:** ADMIN only

```
POST /api/locations
Content-Type: application/json

{
  "code": "R11",
  "name": "Repro Masası 11",
  "area": "REPRO",
  "row": 3,
  "column": 1
}
```

### 8.3 Update Location Slot
**Authorization:** ADMIN only

```
PATCH /api/locations/:id
```

---

## 9. Audit Log Endpoints

### 9.1 Get File Audit Logs
```
GET /api/files/:id/audit-logs
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "actionType": "TAKEOVER",
      "fromDepartment": { "name": "Ön Repro" },
      "toDepartment": { "name": "Repro" },
      "byUser": { "fullName": "Ali Demir" },
      "payload": {},
      "timestamp": "2026-02-02T08:30:00.000Z"
    }
  ]
}
```

### 9.2 Get System Audit Logs
**Authorization:** ADMIN only

```
GET /api/admin/audit-logs
```

**Query Parameters:**
- startDate, endDate
- actionType
- userId
- fileId

---

## 10. Error Codes Reference

| Code | HTTP | Description |
|------|------|-------------|
| UNAUTHORIZED | 401 | Authentication required |
| FORBIDDEN | 403 | Permission denied |
| NOT_FOUND | 404 | Resource not found |
| CONFLICT | 409 | State conflict (active timer exists, etc.) |
| VALIDATION_ERROR | 422 | Input validation failed |
| INVALID_STATE_TRANSITION | 422 | Workflow state transition not allowed |
| FILE_ALREADY_ASSIGNED | 422 | File already has designer |
| TIMER_ALREADY_ACTIVE | 409 | File has active timer |
| NOTE_REQUIRED | 422 | Mandatory note missing |
| INTERNAL_ERROR | 500 | Server error |
