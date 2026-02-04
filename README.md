# Repro Department File Tracking System (RDFTS)

A production-ready web application for a printing cylinder engraving company's Repro department to track physical job files across departments, measure time spent per department (bottleneck analysis), and report employee performance and throughput.

## 🎯 Purpose

This system solves the problem of **lost physical files** in the Repro department by:
- Enforcing mandatory "takeover" (Devral) when receiving physical files
- Logging every transfer with timestamps
- Tracking time spent per department automatically
- Providing searchable file history and current location
- Generating performance and bottleneck reports

## 📚 Documentation

All project documentation is available in the `/docs` folder:

| Document | Description |
|----------|-------------|
| [01_PRD.md](docs/01_PRD.md) | Product Requirements Document - business requirements, user stories, personas |
| [02_TECHNICAL_DESIGN.md](docs/02_TECHNICAL_DESIGN.md) | Technical architecture, state machine, component design |
| [03_DATABASE_SCHEMA.md](docs/03_DATABASE_SCHEMA.md) | PostgreSQL schema, Prisma models, migrations, seed data |
| [04_API_DESIGN.md](docs/04_API_DESIGN.md) | REST API endpoints, payloads, validation rules |
| [05_UI_DESIGN.md](docs/05_UI_DESIGN.md) | Frontend pages, wireframes, UI components |
| [06_IMPLEMENTATION_PLAN.md](docs/06_IMPLEMENTATION_PLAN.md) | Milestones, tasks, timeline |
| [07_TEST_PLAN.md](docs/07_TEST_PLAN.md) | Unit, integration, E2E testing strategy |
| [08_SECURITY_NFR.md](docs/08_SECURITY_NFR.md) | Security model, non-functional requirements |
| [09_SCOPE.md](docs/09_SCOPE.md) | MVP scope and Phase 2 roadmap |

## 🏗️ Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 (App Router), React 18, TypeScript |
| Styling | Tailwind CSS, shadcn/ui |
| Backend | Next.js API Routes, Server Actions |
| Database | PostgreSQL 15 |
| ORM | Prisma 5 |
| Authentication | NextAuth.js (Auth.js) v5 |
| Validation | Zod |
| Charts | Recharts |
| Testing | Vitest, Playwright |
| Containerization | Docker, Docker Compose |

## 🔄 Core Workflow

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│    ÖNREPRO       │────▶│     REPRO        │────▶│    CUSTOMER      │
│  Creates File    │     │   (Designer)     │     │   APPROVAL       │
│                  │     │                  │     │  (Virtual Dept)  │
└──────────────────┘     └────────┬─────────┘     └────────┬─────────┘
                                  │                        │
                                  │◀───────── NOK ────────┘
                                  │           (Same Designer)
                                  │
                                  ▼
                         ┌──────────────────┐
                         │    QUALITY       │
                         │  (Plotter)       │
                         └────────┬─────────┘
                                  │
                    ┌─────── NOK ─┴── OK ─────┐
                    │ (Same Designer)          │
                    ▼                          ▼
           ┌──────────────────┐     ┌──────────────────┐
           │     REPRO        │     │     KOLAJ        │
           │   (Revision)     │     │   (Assembly)     │
           └──────────────────┘     └────────┬─────────┘
                                             │
                                             ▼
                                   ┌──────────────────┐
                                   │  SENT TO         │
                                   │  PRODUCTION      │
                                   │  (Terminal)      │
                                   └──────────────────┘
```

## 👥 User Roles

| Role | Description | Key Permissions |
|------|-------------|-----------------|
| **Admin (Manager)** | Bahar Hanım - Full access | Assign jobs, view reports, manage users |
| **Önrepro** | Pre-production staff | Create files, handle approval flow |
| **Grafiker** | Repro designers | Work on assigned files only |
| **Kalite** | Quality control | Approve/reject designs |
| **Kolaj** | Assembly | Final prep, send to production |

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 15 (or use Docker)

### Development Setup

```bash
# Clone the repository
git clone <repository-url>
cd repro-tracking

# Install dependencies
npm install

# Start database with Docker
docker-compose up -d db

# Setup environment variables
cp .env.example .env

# Run database migrations
npx prisma migrate dev

# Seed the database
npx prisma db seed

# Start development server
npm run dev
```

**Not:** `workSession` / "Cannot read properties of undefined (reading 'findMany')" hatası alırsanız, dev sunucusunu durdurun (Ctrl+C), ardından `npx prisma generate` çalıştırıp tekrar `npm run dev` ile başlatın.

### Docker Setup (Full Stack)

```bash
# Build and start all services
docker-compose up --build

# Access the application
open http://localhost:3000
```

### Default Login Credentials (Seed Data)

| Username | Password | Role |
|----------|----------|------|
| bahar | password123 | Admin |
| onrepro1 | password123 | Önrepro |
| grafiker1 | password123 | Grafiker |      
| kalite1 | password123 | Kalite |
| kolaj1 | password123 | Kolaj |

## 📁 Project Structure

```
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication pages
│   │   └── login/
│   ├── (dashboard)/       # Protected dashboard pages
│   │   ├── admin/         # Admin settings
│   │   ├── assignments/   # Assignment pool
│   │   ├── files/         # File management
│   │   ├── queue/         # Department queue
│   │   └── reports/       # Reports & analytics
│   └── api/               # API routes
│       ├── auth/
│       ├── files/
│       ├── locations/
│       ├── reports/
│       └── users/
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── layout/           # Layout components
│   ├── files/            # File-related components
│   ├── dashboard/        # Dashboard components
│   └── reports/          # Report components
├── lib/                   # Core libraries
│   ├── auth/             # Authentication & RBAC
│   ├── db/               # Database client
│   ├── services/         # Business logic
│   ├── validations/      # Zod schemas
│   └── utils/            # Utility functions
├── prisma/                # Prisma ORM
│   ├── schema.prisma     # Database schema
│   ├── migrations/       # Database migrations
│   └── seed.ts           # Seed data script
├── tests/                 # Test files
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docs/                  # Documentation
└── docker-compose.yml     # Docker configuration
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e

# Run with coverage
npm run test:coverage
```

## 📊 Key Features

### File Tracking
- Create and search files by file number
- Track current holder, department, and physical location
- View complete timeline with all events and durations
- Add notes in chronological order

### Timer System
- Automatic timer start/stop on takeover and transfer
- Exactly one active timer per file (enforced)
- Support for multiple timer entries per department
- Duration calculation and reporting

### Workflow Management
- Full R100 approval loop (design → customer → quality)
- Full R200 quality loop (quality → kolaj → production)
- Permanent designer ownership (no reassignment on NOK)
- MG iteration tracking for customer revisions

### Reporting
- Dashboard with real-time statistics
- Overdue/bottleneck alerts
- Designer throughput reports
- Department average time analysis

## 🔒 Security

- Session-based authentication with secure cookies
- Role-based access control (RBAC) at multiple layers
- Input validation with Zod
- SQL injection prevention via Prisma ORM
- XSS protection with React escaping
- CSRF protection via NextAuth
- Comprehensive audit logging

## 📋 Environment Variables

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/repro_tracking"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# Optional
LOG_LEVEL="info"
```

## 📦 Zorluk + Dosya Tipi + Süre/Performans (Implementation Summary)

### Değiştirilen / Eklenen Dosyalar

**Prisma & DB**
- `prisma/schema.prisma` — FileType modeli, File’a fileTypeId, difficultyLevel, difficultyWeight, timeEntries; TimeEntry modeli; User/Department’a timeEntries.
- `prisma/seed.ts` — GENEL dosya tipi, mevcut dosyalara fileTypeId/difficulty ataması.
- `prisma/migrations/20260203111718_add_file_type_time_entry/migration.sql` — migration.

**Servisler**
- `lib/services/file-type.service.ts` — FileType CRUD.
- `lib/services/time-entry.service.ts` — start/stop/active, getMyTimeSummary.
- `lib/services/analytics.service.ts` — getUsersAnalytics (weightedScore, productivity, fileType/department kırılımı).
- `lib/services/file.service.ts` — createFile (default fileType), getFileById (fileType include), adminUpdateFile.

**Validations**
- `lib/validations.ts` — createFileTypeSchema, updateFileTypeSchema, adminUpdateFileSchema, timeStartSchema, timeStopSchema, analyticsUsersQuerySchema, mySummaryQuerySchema, fileQuerySchema (fileTypeId, difficultyLevel).

**API**
- `app/api/admin/file-types/route.ts` — GET, POST.
- `app/api/admin/file-types/[id]/route.ts` — GET, PATCH, DELETE.
- `app/api/admin/files/[id]/route.ts` — PATCH (admin).
- `app/api/time/start/route.ts` — POST.
- `app/api/time/stop/route.ts` — POST.
- `app/api/time/my-active/route.ts` — GET.
- `app/api/time/my-summary/route.ts` — GET.
- `app/api/admin/analytics/users/route.ts` — GET.

**Frontend**
- `components/layout/sidebar.tsx` — Analitik, Dosya Tipleri linkleri.
- `app/dashboard/admin/file-types/page.tsx` — Dosya tipleri sayfası.
- `app/dashboard/admin/file-types/file-types-client.tsx` — Liste, oluştur/düzenle/sil.
- `app/dashboard/admin/analytics/page.tsx` — Analitik sayfası.
- `app/dashboard/admin/analytics/analytics-client.tsx` — Tarih aralığı, kullanıcı tablosu, kırılım.
- `app/dashboard/files/page.tsx` — fileType/difficulty/assignedUser sütunları, filtreler, FilesRow.
- `app/dashboard/files/files-row.tsx` — Satır içi admin düzenleme (fileType, assignedUser, difficulty, weight).
- `app/dashboard/files/[id]/page.tsx` — Süre takibi kartı, FileTimer.
- `components/files/file-timer.tsx` — Start/Stop timer (TimeEntry).
- `components/layout/active-work-session.tsx` — time/my-active + work-sessions/active, stop her ikisini kapatır.
- `components/dashboard/my-summary-card.tsx` — Haftalık süre özeti (fileType kırılımı).
- `app/dashboard/page.tsx` — MySummaryCard (çalışanlar için).

**Test**
- `vitest.config.ts` — Vitest config.
- `lib/services/time-entry.service.test.ts` — Tek aktif TimeEntry kuralı.
- `lib/services/analytics.service.test.ts` — weightedScore / productivity hesapları.

### Çalıştırma Adımları

```bash
cd repro_dashboard
pnpm install
pnpm prisma migrate dev    # veya: pnpm db:migrate
pnpm prisma db seed        # veya: pnpm db:seed
pnpm dev
```

### Endpoint Örnekleri (curl)

Admin token/session gerekir; tarayıcıda giriş yapıp cookie ile veya Bearer token ile istek atılabilir.

**Dosya tipleri**
```bash
# Liste
curl -s -b cookies.txt "http://localhost:3000/api/admin/file-types"

# Oluştur
curl -s -X POST -b cookies.txt -H "Content-Type: application/json" \
  -d '{"name":"Ambalaj","description":"Ambalaj işleri","defaultDifficultyLevel":3,"defaultDifficultyWeight":1.2}' \
  "http://localhost:3000/api/admin/file-types"

# Güncelle
curl -s -X PATCH -b cookies.txt -H "Content-Type: application/json" \
  -d '{"name":"Ambalaj","defaultDifficultyWeight":1.5}' \
  "http://localhost:3000/api/admin/file-types/<id>"

# Sil (opsiyonel fallback)
curl -s -X DELETE -b cookies.txt "http://localhost:3000/api/admin/file-types/<id>?fallbackFileTypeId=<genelId>"
```

**Admin dosya güncelleme**
```bash
curl -s -X PATCH -b cookies.txt -H "Content-Type: application/json" \
  -d '{"assignedUserId":"<userId>","fileTypeId":"<fileTypeId>","difficultyLevel":4,"difficultyWeight":1.5}' \
  "http://localhost:3000/api/admin/files/<fileId>"
```

**Süre takibi**
```bash
# Başlat
curl -s -X POST -b cookies.txt -H "Content-Type: application/json" \
  -d '{"fileId":"<fileId>"}' "http://localhost:3000/api/time/start"

# Durdur
curl -s -X POST -b cookies.txt -H "Content-Type: application/json" \
  -d '{"fileId":"<fileId>"}' "http://localhost:3000/api/time/stop"

# Aktif kayıt
curl -s -b cookies.txt "http://localhost:3000/api/time/my-active"
```

**Analitik**
```bash
curl -s -b cookies.txt "http://localhost:3000/api/admin/analytics/users?from=2025-01-01&to=2025-02-03"
```

### Dosya Bilgileri + Atama Havuzu

**Yeni endpointler**
- `GET /api/assignments/pool` — Atama bekleyen dosyaları döner (status AWAITING_ASSIGNMENT). Yetki: `file:assign`.
- `POST /api/assignments/bulk` — Toplu atama. Body: `{ fileIds: string[], assigneeId: string, note?: string }`. Seçili dosyaların tümünü aynı grafikere atar. Response: `successCount`, `failCount`, `results`, `skippedIds`.
- `POST /api/assignments/single` — Tekil atama. Body: `{ fileId: string, assigneeId: string }`.
- `GET /api/files/customers?q=...` — Müşteri autocomplete için distinct customerName listesi.
- `GET /api/files/next-file-no` — Sonraki otomatik dosya numarası (örn. REP-2026-0001). Yetki: `file:create`.

**Toplu ve tekil atama mantığı**
- Atama havuzu: `AWAITING_ASSIGNMENT` durumundaki dosyalar listelenir. Admin (veya `file:assign` yetkisi olan roller) havuzu görür.
- Toplu atama: Birden fazla dosya seçilip "Toplu Ata" ile aynı grafikere atanır; atanan dosyalar havuzdan düşer. Bir veya daha fazla dosya atanamazsa response içinde `failCount`, `results` ve `skippedIds` ile bilgi verilir.
- Tekil atama: Her satırdaki "Grafiker seç" dropdown ile tek dosya atanır; atama sonrası o dosya listeden kalkar.
- Atama işlemi mevcut `File.assignedDesignerId` ve `File.status` (ASSIGNED) güncellemesi ile yapılır; ayrı Assignment tablosu kullanılmaz.

---

## 🗺️ Roadmap

### MVP (Current)
- ✅ Core file management
- ✅ Full workflow (R100/R200)
- ✅ Timer system
- ✅ Location tracking
- ✅ Basic reporting
- ✅ RBAC

### Phase 2 (Planned)
- 📊 Advanced reporting & analytics
- 🔔 In-app notifications
- 📧 Email alerts
- 📱 PWA support
- 🔗 WebSocket real-time updates
- 📤 Excel export

## 📄 License

Proprietary - All rights reserved.

## 🤝 Support

For questions or issues, contact the development team.
