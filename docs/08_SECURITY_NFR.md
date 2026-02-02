# Security Model & Non-Functional Requirements
# Repro Department File Tracking System

**Version:** 1.0  
**Date:** February 2, 2026

---

## 1. Security Model

### 1.1 Authentication

#### 1.1.1 Authentication Strategy
- **Method:** Session-based authentication via NextAuth.js
- **Session Storage:** JWT tokens stored in HTTP-only cookies
- **Session Duration:** 8 hours (configurable)
- **Idle Timeout:** 30 minutes of inactivity

#### 1.1.2 Password Policy
| Requirement | Value |
|-------------|-------|
| Minimum Length | 8 characters |
| Character Requirements | At least 1 uppercase, 1 lowercase, 1 number |
| Password Hashing | bcrypt with cost factor 10 |
| Password History | Last 3 passwords cannot be reused |
| Maximum Failed Attempts | 5 attempts before 15-minute lockout |

```typescript
// lib/auth/password.ts
import bcrypt from 'bcrypt';
import { z } from 'zod';

const SALT_ROUNDS = 10;

export const passwordSchema = z.string()
  .min(8, 'Şifre en az 8 karakter olmalıdır')
  .regex(/[A-Z]/, 'Şifre en az bir büyük harf içermelidir')
  .regex(/[a-z]/, 'Şifre en az bir küçük harf içermelidir')
  .regex(/[0-9]/, 'Şifre en az bir rakam içermelidir');

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

#### 1.1.3 Session Management
```typescript
// lib/auth/auth.config.ts
import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // Validate credentials
        // Return user object or null
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 hours
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.departmentId = user.departmentId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.departmentId = token.departmentId as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
};
```

### 1.2 Authorization (RBAC)

#### 1.2.1 Role Hierarchy
```
ADMIN (Highest)
  └── Can perform all actions
  └── Manages users, settings, overrides
  
ONREPRO
  └── Creates files
  └── Handles approval workflow
  └── Records customer decisions

GRAFIKER
  └── Works on assigned files only
  └── Can request approval, transfer

KALITE
  └── Reviews and approves/rejects
  └── Limited to quality actions

KOLAJ (Most restricted)
  └── Final assembly only
  └── Can send to production
```

#### 1.2.2 Permission Enforcement Layers

**Layer 1: Route Middleware**
```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

const protectedRoutes = ['/dashboard', '/files', '/admin'];
const adminRoutes = ['/admin', '/reports'];

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });
  const path = request.nextUrl.pathname;

  // Check authentication
  if (protectedRoutes.some(route => path.startsWith(route))) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Check admin routes
  if (adminRoutes.some(route => path.startsWith(route))) {
    if (token?.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}
```

**Layer 2: API Route Guards**
```typescript
// lib/auth/guards.ts
import { getServerSession } from 'next-auth';
import { authOptions } from './auth.config';
import { NextResponse } from 'next/server';

export async function withAuth(
  handler: (req: Request, user: User) => Promise<Response>,
  permission?: Permission
) {
  return async (req: Request) => {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Giriş yapmanız gerekiyor' } },
        { status: 401 }
      );
    }

    if (permission && !hasPermission(session.user.role, permission)) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Bu işlem için yetkiniz yok' } },
        { status: 403 }
      );
    }

    return handler(req, session.user);
  };
}
```

**Layer 3: Business Logic Checks**
```typescript
// lib/services/file.service.ts
async function assignFile(fileId: string, designerId: string, currentUser: User) {
  // Permission already checked at API layer
  
  const file = await prisma.file.findUnique({ where: { id: fileId } });
  
  // Additional business rule: only assign unassigned files
  if (file.assignedDesignerId) {
    throw new BusinessError('Bu dosya zaten atanmış');
  }
  
  // ... proceed with assignment
}
```

### 1.3 Data Security

#### 1.3.1 Input Validation
All inputs validated using Zod schemas before processing:

```typescript
// lib/validations/file.schema.ts
import { z } from 'zod';

export const createFileSchema = z.object({
  fileNo: z.string()
    .min(1, 'Dosya no zorunludur')
    .max(50, 'Dosya no en fazla 50 karakter olabilir')
    .regex(/^[A-Z0-9-]+$/i, 'Dosya no sadece harf, rakam ve tire içerebilir'),
  customerName: z.string()
    .min(1, 'Müşteri adı zorunludur')
    .max(200, 'Müşteri adı en fazla 200 karakter olabilir')
    .transform(val => val.trim()),
  customerNo: z.string().max(50).optional(),
  ksmData: z.record(z.any()).optional(),
  locationSlotId: z.string().uuid('Geçersiz konum ID'),
  requiresApproval: z.boolean().default(true),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
});

export const noteSchema = z.object({
  message: z.string()
    .min(1, 'Not içeriği zorunludur')
    .max(5000, 'Not en fazla 5000 karakter olabilir'),
});

export const nokNoteSchema = z.object({
  note: z.string()
    .min(10, 'Red notu en az 10 karakter olmalıdır')
    .max(5000),
});
```

#### 1.3.2 SQL Injection Prevention
- All database queries through Prisma ORM (parameterized queries)
- No raw SQL queries without parameterization
- Input sanitization before database operations

#### 1.3.3 XSS Prevention
- React's built-in escaping for rendered content
- Content-Security-Policy headers
- No `dangerouslySetInnerHTML` without sanitization

```typescript
// next.config.js
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
];
```

#### 1.3.4 CSRF Protection
- NextAuth.js includes CSRF protection by default
- All mutating API routes require authentication
- Same-site cookie policy

### 1.4 Audit Trail

#### 1.4.1 What is Logged
| Event Type | Data Captured |
|------------|---------------|
| Authentication | User ID, timestamp, success/failure, IP |
| File Creation | User, file data, timestamp |
| Assignment | Assigner, assignee, file, timestamp |
| Takeover | User, file, department, timestamp |
| Transfer | User, from/to department, timestamp |
| Status Change | User, old/new status, timestamp |
| NOK Actions | User, reason/note, timestamp |
| Override | Admin, action, detailed reason, timestamp |
| User Management | Admin, action, affected user, timestamp |

#### 1.4.2 Audit Log Immutability
- Audit logs are INSERT-only (no UPDATE or DELETE)
- Soft delete not available for audit records
- Archival policy: keep for 7 years

```typescript
// lib/services/audit.service.ts
export async function createAuditLog(
  fileId: string,
  actionType: ActionType,
  userId: string,
  payload?: Record<string, any>,
  options?: {
    fromDepartmentId?: string;
    toDepartmentId?: string;
    ipAddress?: string;
  }
) {
  return prisma.auditLog.create({
    data: {
      fileId,
      actionType,
      byUserId: userId,
      fromDepartmentId: options?.fromDepartmentId,
      toDepartmentId: options?.toDepartmentId,
      payload: payload ?? Prisma.JsonNull,
      ipAddress: options?.ipAddress,
      timestamp: new Date(),
    },
  });
}
```

### 1.5 Data Privacy

#### 1.5.1 Sensitive Data Handling
- Passwords stored as bcrypt hashes only
- No PII in logs (except user IDs for audit)
- Customer data treated as confidential

#### 1.5.2 Data Retention
| Data Type | Retention Period |
|-----------|------------------|
| Active files | Until closed + 2 years |
| Closed files | 5 years |
| Audit logs | 7 years |
| User accounts | Until deactivated + 2 years |

---

## 2. Non-Functional Requirements

### 2.1 Performance Requirements

#### 2.1.1 Response Time Targets

| Operation | Target | Maximum |
|-----------|--------|---------|
| Page Load (cached) | < 1s | 2s |
| Page Load (uncached) | < 2s | 4s |
| API Response (simple) | < 100ms | 300ms |
| API Response (complex) | < 300ms | 1s |
| File Search | < 100ms | 500ms |
| Report Generation | < 3s | 10s |
| Dashboard Load | < 2s | 5s |

#### 2.1.2 Throughput
- Support 50 concurrent users minimum
- Handle 1000 API requests per minute
- Process 100 file operations per minute

#### 2.1.3 Database Performance
```sql
-- Required indexes for performance
CREATE INDEX idx_files_file_no ON files(file_no);
CREATE INDEX idx_files_status ON files(status);
CREATE INDEX idx_files_assigned_designer ON files(assigned_designer_id);
CREATE INDEX idx_files_current_department ON files(current_department_id);
CREATE INDEX idx_files_created_at ON files(created_at);
CREATE INDEX idx_files_pending_takeover ON files(pending_takeover);

CREATE INDEX idx_timers_file ON timers(file_id);
CREATE INDEX idx_timers_end_time ON timers(end_time);

CREATE INDEX idx_audit_logs_file ON audit_logs(file_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
```

### 2.2 Scalability

#### 2.2.1 Vertical Scaling Targets
| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 2 cores | 4 cores |
| RAM | 4 GB | 8 GB |
| Storage | 20 GB | 100 GB |
| Database | 2 GB RAM | 4 GB RAM |

#### 2.2.2 Data Volume Targets
| Entity | Year 1 | Year 3 | Year 5 |
|--------|--------|--------|--------|
| Files | 5,000 | 15,000 | 30,000 |
| Timers | 25,000 | 75,000 | 150,000 |
| Audit Logs | 50,000 | 150,000 | 300,000 |
| Notes | 10,000 | 30,000 | 60,000 |

### 2.3 Availability

#### 2.3.1 Uptime Target
- **Target:** 99.5% uptime (excludes planned maintenance)
- **Allowed Downtime:** ~3.65 hours/month
- **Planned Maintenance Window:** Sundays 02:00-04:00 (Europe/Istanbul)

#### 2.3.2 Recovery Targets
| Metric | Target |
|--------|--------|
| RTO (Recovery Time Objective) | 4 hours |
| RPO (Recovery Point Objective) | 1 hour |

#### 2.3.3 Backup Strategy
```bash
# Automated daily backup
0 2 * * * /scripts/backup.sh

# backup.sh
#!/bin/bash
BACKUP_DIR="/backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)

# Full backup
pg_dump -Fc repro_tracking > "$BACKUP_DIR/full_$DATE.dump"

# Keep 7 daily, 4 weekly, 12 monthly
find $BACKUP_DIR -name "full_*.dump" -mtime +7 -delete
```

### 2.4 Reliability

#### 2.4.1 Data Integrity
- All database operations in transactions
- Foreign key constraints enforced
- Check constraints on enums
- Timer uniqueness constraint (one active per file)

```typescript
// Ensure exactly one active timer per file
async function startTimerSafe(fileId: string, departmentId: string, userId: string | null) {
  return prisma.$transaction(async (tx) => {
    // Check for existing active timer
    const activeTimer = await tx.timer.findFirst({
      where: { fileId, endTime: null },
    });

    if (activeTimer) {
      throw new ConflictError('Bu dosyada zaten aktif bir zamanlayıcı var');
    }

    // Create new timer
    return tx.timer.create({
      data: {
        fileId,
        departmentId,
        userId,
        startTime: new Date(),
      },
    });
  }, {
    isolationLevel: 'Serializable',
  });
}
```

#### 2.4.2 Error Handling
```typescript
// lib/utils/errors.ts
export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 500,
    public details?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, string[]>) {
    super('VALIDATION_ERROR', message, 422, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Kayıt bulunamadı') {
    super('NOT_FOUND', message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super('CONFLICT', message, 409);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Giriş yapmanız gerekiyor') {
    super('UNAUTHORIZED', message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Bu işlem için yetkiniz yok') {
    super('FORBIDDEN', message, 403);
  }
}
```

### 2.5 Usability

#### 2.5.1 Accessibility
- WCAG 2.1 Level AA compliance
- Keyboard navigation support
- Screen reader compatibility
- Minimum color contrast 4.5:1

#### 2.5.2 Browser Support
| Browser | Minimum Version |
|---------|-----------------|
| Chrome | 90+ |
| Firefox | 88+ |
| Edge | 90+ |
| Safari | 14+ |

#### 2.5.3 Responsive Design
| Breakpoint | Min Width | Layout |
|------------|-----------|--------|
| Mobile | 0 | Single column |
| Tablet | 768px | 2 columns |
| Desktop | 1024px | Full layout |

#### 2.5.4 Language
- Primary language: Turkish (tr-TR)
- All UI labels in Turkish
- Date/time format: dd.MM.yyyy HH:mm
- Number format: Turkish locale (1.234,56)

### 2.6 Maintainability

#### 2.6.1 Code Quality
- TypeScript strict mode enabled
- ESLint + Prettier for code formatting
- Minimum 75% test coverage
- No TypeScript `any` types (except explicitly allowed)

#### 2.6.2 Documentation
- API documentation (this document)
- Code comments for complex logic
- README with setup instructions
- Architecture decision records

#### 2.6.3 Logging
```typescript
// lib/utils/logger.ts
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  timestamp: string;
  message: string;
  context?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

export const logger = {
  debug: (message: string, context?: Record<string, any>) => log('debug', message, context),
  info: (message: string, context?: Record<string, any>) => log('info', message, context),
  warn: (message: string, context?: Record<string, any>) => log('warn', message, context),
  error: (message: string, error?: Error, context?: Record<string, any>) => {
    const entry: LogEntry = {
      level: 'error',
      timestamp: new Date().toISOString(),
      message,
      context,
    };
    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }
    console.error(JSON.stringify(entry));
  },
};

function log(level: LogLevel, message: string, context?: Record<string, any>) {
  const entry: LogEntry = {
    level,
    timestamp: new Date().toISOString(),
    message,
    context,
  };
  console.log(JSON.stringify(entry));
}
```

### 2.7 Deployment

#### 2.7.1 Container Configuration
```dockerfile
# Dockerfile
FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

#### 2.7.2 Docker Compose
```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/repro_tracking
      - NEXTAUTH_URL=http://localhost:3000
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=repro_tracking
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  pgdata:
```

### 2.8 Monitoring

#### 2.8.1 Health Check Endpoint
```typescript
// app/api/health/route.ts
import { prisma } from '@/lib/db/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'ok',
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        checks: {
          database: 'failed',
        },
      },
      { status: 503 }
    );
  }
}
```

#### 2.8.2 Metrics to Monitor
| Metric | Warning | Critical |
|--------|---------|----------|
| CPU Usage | > 70% | > 90% |
| Memory Usage | > 70% | > 90% |
| Response Time (p95) | > 1s | > 3s |
| Error Rate | > 1% | > 5% |
| Database Connections | > 80% | > 95% |
| Disk Usage | > 70% | > 90% |

---

## 3. Compliance Checklist

### 3.1 Security Checklist
- [ ] Authentication implemented with secure session handling
- [ ] RBAC enforced at multiple layers
- [ ] All inputs validated and sanitized
- [ ] No SQL injection vulnerabilities
- [ ] XSS protection in place
- [ ] CSRF protection enabled
- [ ] Passwords properly hashed
- [ ] Audit logging comprehensive
- [ ] Security headers configured
- [ ] HTTPS enforced in production

### 3.2 Performance Checklist
- [ ] Database indexes created
- [ ] API response times within targets
- [ ] Page load times acceptable
- [ ] Pagination implemented for lists
- [ ] Caching strategy in place
- [ ] No N+1 query problems

### 3.3 Reliability Checklist
- [ ] Backup strategy implemented
- [ ] Error handling comprehensive
- [ ] Transaction isolation correct
- [ ] Health check endpoint available
- [ ] Logging in place
- [ ] Graceful degradation for failures
