# Repro Dashboard (RDFTS)

Repro departmanı için **fiziksel iş dosyalarının** departmanlar arası takibi, devir (devral/devret) kayıtları, süre ölçümü (bottleneck analizi) ve raporlama sağlayan Next.js + PostgreSQL uygulaması.

## ✅ Bu README neyi garanti eder?

Bu dosya, repodaki gerçek yapı/komutlarla uyumludur:
- **Package manager**: `npm` (repoda `package-lock.json` var)
- **DB**: `docker-compose.yml` içindeki `db` servisi (PostgreSQL 15)
- **Prisma**: script’ler `package.json` içinde (`db:push`, `db:seed`, `db:migrate`, `db:studio`)
- **Auth**: NextAuth **v4** (Credentials Provider, JWT session)
- **Seed kullanıcıları**: `prisma/seed.ts` içinde tanımlı (aşağıda tam liste var)

> Not: Repoda ayrıca `backend/` (Express+SQLite) ve `frontend/` (Vite) klasörleri var; bunlar **legacy/demo**. Bu README’nin ana konusu `repro_dashboard/` kökündeki **Next.js** uygulamasıdır.

## 📚 Dokümantasyon

Detaylı tasarım/dokümanlar `docs/` altında:

| Dosya | Açıklama |
|------|----------|
| `docs/01_PRD.md` | İş gereksinimleri, user story’ler |
| `docs/02_TECHNICAL_DESIGN.md` | Mimari, state machine, bileşen tasarımı |
| `docs/03_DATABASE_SCHEMA.md` | PostgreSQL/Prisma şeması ve seed |
| `docs/04_API_DESIGN.md` | API uçları, payload’lar |
| `docs/05_UI_DESIGN.md` | Sayfalar ve UI akışları |
| `docs/06_IMPLEMENTATION_PLAN.md` | Uygulama planı |
| `docs/07_TEST_PLAN.md` | Test stratejisi (doküman seviyesi) |
| `docs/08_SECURITY_NFR.md` | Güvenlik/NFR |
| `docs/09_SCOPE.md` | Kapsam ve roadmap |

## 🏗️ Teknoloji yığını

| Katman | Teknoloji |
|-------|------------|
| UI | Next.js 14 (App Router), React 18, TypeScript |
| Stil | Tailwind CSS, shadcn/ui |
| Backend | Next.js Route Handlers (`app/api/...`) |
| DB | PostgreSQL 15 |
| ORM | Prisma 5 |
| Auth | NextAuth.js v4 (Credentials) |
| Validation | Zod |
| Grafik | Recharts |
| Test | Vitest |
| Container | Docker, Docker Compose |

## 🔄 Temel iş akışı (özet)

Özet akış:
- Önrepro dosyayı oluşturur / kuyruğa alır
- Repro (grafiker) çalışır, gerekiyorsa müşteri onayı (virtual departman) döngüsü olur
- Kalite kontrol ve kolaj adımları
- Üretime gönderilince kapanır

## 🧭 Yeni başlayanlar için hızlı adaptasyon

### 15 dakikada sistemi anlayın

- **Uygulamayı çalıştırın**: `.\start-local.ps1` (DB + seed + `npm run dev`)
- **Giriş yapın**: `bahar / password123` (ADMIN)
- **Admin akışını gezin**
  - `Dashboard`: genel metrikler, “Atama bekliyor”
  - `Assignments`: atama havuzu (AWAITING_ASSIGNMENT → ASSIGNED)
  - `Files`: dosya listesi ve dosya detayına girin
- **Dosya detayında** timeline / notlar / aksiyonlar üzerinden akışı izleyin

### Kodda “nereden başlamalı?”

Yeni giren birinin en hızlı kavram kazanacağı dosyalar:

- **Auth / session tipleri**
  - `lib/auth.ts`: NextAuth Credentials + session/jwt alanları
  - `app/api/auth/[...nextauth]/route.ts`: NextAuth handler
- **Route koruması**
  - `middleware.ts`: `/dashboard` ve `/api/*` için auth zorunluluğu + admin route guard
- **RBAC + workflow kuralları**
  - `lib/rbac.ts`: rol→permission + aksiyon uygunluğu + state transition doğrulama
- **Domain servisleri**
  - `lib/services/workflow.service.ts`: onay/kalite/üretim akış fonksiyonları
  - `lib/services/file.service.ts`: file oluşturma/sorgulama + timer/worksession entegrasyonu
  - `lib/services/audit.service.ts`: audit log yazımı/okunması
- **DB modelleri**
  - `prisma/schema.prisma`: tüm tablo/enum ilişkileri
  - `prisma/seed.ts`: seed kullanıcılar + örnek dosyalar
  - `prisma/seed-files-only.ts`: sadece dosya seed'i (yeni gelmiş, işlem yapılmamış dosyalar)

### İstek akışı (mental model)

Bu projede tipik akış şu şekilde ilerler:

- **UI (Server Component / Client Component)** → `/app/dashboard/**` ve `components/**`
- **API (Route Handler)** → `app/api/**/route.ts`
- **Service katmanı** → `lib/services/*.ts`
- **DB** → `lib/db.ts` (Prisma client) → Postgres

Not: Bazı dashboard sayfaları (özellikle admin metrikleri) **server component** içinde doğrudan `prisma` ile query de atıyor; “business rule” içeren işler çoğunlukla `lib/services/` altına toplanmış.

## 🚀 Hızlı başlangıç (Windows / PowerShell)

### Gereksinimler

- Node.js **20+**
- Docker Desktop (önerilir, DB için)

### Seçenek A (önerilir): Tek komutla başlat

PowerShell’de:

```bash
cd repro_dashboard
.\start-local.ps1
```

Bu script şunları yapar:
- `.env` yoksa `.env.example`’dan oluşturur
- Docker açıksa `db`’yi başlatır
- Prisma ile şemayı uygular (`prisma db push`)
- Seed çalıştırır (`prisma db seed`)
- `npm run dev` ile uygulamayı başlatır

Uygulama: `http://localhost:3000`

### Seçenek B: Manuel kurulum

```bash
cd repro_dashboard

npm install

# DB (Docker)
docker-compose up -d db

# .env
copy .env.example .env

# Şema + seed
npm run db:push
npm run db:seed

# (İsteğe bağlı) Sadece yeni dosya seed'i: kişi/profil yok, tüm dosyalar AWAITING_ASSIGNMENT, işlem yok
# npm run db:seed-files-only

# Uygulama
npm run dev
```

## 🔐 Ortam değişkenleri (.env) + örnek credential’lar

### Tam örnek `.env` (kopyala-yapıştır)

> Güvenlik: Bu dosyadaki **secret** değerlerini üretimde değiştirin ve `.env`’yi repoya koymayın.

```bash
# Database (LOCAL)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/repro_tracking"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="dev-only-change-me"

# App
NODE_ENV="development"

# KSM Teknik Verileri – dış VIEW ingestion (opsiyonel)
# Birini set etmeniz yeterli:
# KSM_VIEW_DATABASE_URL="postgresql://user:pass@host:5432/external_db"
# EXTERNAL_DATABASE_URL="postgresql://user:pass@host:5432/external_db"
# KSM_VIEW_NAME="ksm_technical_view"
```

### Docker ile tam stack çalıştırma

```bash
cd repro_dashboard

# Compose, aynı klasördeki `.env` dosyasını otomatik okur.
# NEXTAUTH_SECRET set edilmezse, docker-compose varsayılan olarak "dev-secret-key" kullanır.
docker-compose up --build
```

Uygulama: `http://localhost:3000`

Docker compose içinde app şu DB URL’i kullanır:
- `postgresql://postgres:postgres@db:5432/repro_tracking`

## 👤 Default giriş bilgileri (seed)

Seed çalıştırınca (`npm run db:seed`) aşağıdaki kullanıcılar oluşur. Şifrelerin tamamı:

- **Password**: `password123`

| Username | Role | Not |
|----------|------|-----|
| `bahar` | ADMIN | Yönetici |
| `onrepro1` | ONREPRO | Önrepro |
| `onrepro2` | ONREPRO | Önrepro |
| `grafiker1` | GRAFIKER | Repro grafiker |
| `grafiker2` | GRAFIKER | Repro grafiker |
| `grafiker3` | GRAFIKER | Repro grafiker |
| `kalite1` | KALITE | Kalite |
| `kolaj1` | KOLAJ | Kolaj |

## 🗄️ Veritabanı / Prisma komutları

```bash
# Şemayı DB’ye uygula (hızlı local)
npm run db:push

# Migration tabanlı uygulama (schema değişikliklerinde)
npm run db:migrate

# Seed
npm run db:seed

# Prisma Studio
npm run db:studio
```

## 🧪 Test

Bu projede test runner **Vitest**.

```bash
npm test
npm run test:coverage
```

## 🧩 Proje yapısı (detaylı)

```
repro_dashboard/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout + global css + toaster
│   ├── page.tsx                  # Landing (varsa)
│   ├── login/page.tsx            # Credentials login ekranı
│   ├── dashboard/                # Korunan ekranlar (auth gerekli)
│   │   ├── layout.tsx            # Sidebar/Header + session guard (redirect /login)
│   │   ├── page.tsx              # Role bazlı dashboard metrikleri
│   │   ├── files/                # Dosyalar: liste + detay + yeni kayıt
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── queue/page.tsx        # Kullanıcının departman kuyruğu
│   │   ├── queues/pre-repro/     # Özel kuyruk ekranı (pre-repro)
│   │   ├── assignments/page.tsx  # Admin atama havuzu
│   │   ├── reports/page.tsx      # Raporlar (admin)
│   │   └── admin/                # Admin ekranları (settings/users/analytics/file-types)
│   └── api/                      # Route Handlers (REST benzeri)
│       ├── auth/[...nextauth]/   # NextAuth endpoint’leri
│       ├── files/                # Dosya CRUD + alt aksiyon route’ları
│       ├── assignments/          # Atama havuzu + bulk/single
│       ├── queues/               # Queue endpoint’leri
│       ├── time/                 # time start/stop + summary uçları
│       ├── work-sessions/        # aktif work session vb.
│       └── admin/                # admin-only api (analytics, file-types, admin file patch)
├── components/                   # React bileşenleri
│   ├── layout/                   # Sidebar/Header
│   ├── files/                    # Dosya detay aksiyonları + timer UI
│   ├── dashboard/                # Dashboard kartları (örn. MySummaryCard)
│   └── ui/                       # shadcn/ui primitive’leri + toaster
├── lib/
│   ├── db.ts                     # Prisma client singleton
│   ├── auth.ts                   # NextAuth options + session typing
│   ├── rbac.ts                   # Role/permission + action rules + transition validation
│   ├── validations.ts            # Zod schema’lar (request payload validation)
│   ├── utils.ts                  # Formatlar/label map’leri vb.
│   ├── types.ts                  # Ortak type tanımları (Permission vb.)
│   └── services/                 # Domain iş kuralları
│       ├── file.service.ts       # file oluşturma/sorgulama + bazı aksiyonlar
│       ├── workflow.service.ts   # approval/quality/production state değişimleri
│       ├── timer.service.ts      # Timer (start/stop/active)
│       ├── time-entry.service.ts # TimeEntry (ayrı time tracking katmanı)
│       ├── work-session.service.ts
│       ├── audit.service.ts      # AuditLog
│       ├── analytics.service.ts  # Admin analytics
│       └── ksm-view-ingest.service.ts # External VIEW ingestion (opsiyonel)
├── prisma/
│   ├── schema.prisma             # DB şeması (enum/model/relations)
│   ├── migrations/               # migrate dev çıktıları
│   └── seed.ts                   # seed users + sample files
├── middleware.ts                 # Route guard (auth + admin sayfaları)
├── docker-compose.yml            # postgres + app (prod-like)
├── Dockerfile                    # compose için build (Next.js production)
├── .dockerignore
└── start-local.ps1               # Windows için hızlı local başlatma
```

### Önemli konseptler (DB tarafı)

Yeni biri için en kritik model/alanlar:

- **`File`**: ana iş objesi (status, stage, currentDepartmentId, assignedDesignerId, pendingTakeover, requiresApproval)
- **`AuditLog`**: her transfer/aksiyon burada (timeline için temel kaynak)
- **`Timer`**: departman bazlı süre ölçümü (startTime/endTime)
- **`WorkSession`**: “kullanıcı şu dosyada çalışıyor” oturumu
- **`TimeEntry`**: (varsa) daha granular time tracking
- **`Department`**: ONREPRO/REPRO/KALITE/KOLAJ + virtual CUSTOMER
- **`LocationSlot`**: fiziksel lokasyon raf/masa kodları (A1, R1, Q1…)

### Auth / yetkilendirme nerede?

- **Session oluşturma**: `lib/auth.ts` (Credentials login + bcrypt compare)
- **Route koruması**: `middleware.ts`
  - `/dashboard/**` için token zorunlu
  - `/api/**` için token zorunlu (NextAuth route’ları hariç)
  - `/dashboard/admin`, `/dashboard/reports`, `/dashboard/assignments` admin değilse `/dashboard`’a redirect
- **RBAC kuralları**: `lib/rbac.ts`

### Workflow/state değişimleri nerede?

- Approval / müşteri döngüsü / kalite / üretim gibi state değişimleri: `lib/services/workflow.service.ts`
- File oluşturma, dosya sorgulama, bazı yardımcılar: `lib/services/file.service.ts`
- Aksiyonların izlenebilirliği: `lib/services/audit.service.ts` (+ DB’de `AuditLog`)

## 🧱 Legacy/demo klasörleri (opsiyonel)

Bu repo içinde ayrıca şunlar var:
- `backend/`: Express + SQLite demo backend (Next.js uygulaması tarafından kullanılmaz)
- `frontend/`: Vite + React demo frontend (Next.js uygulaması tarafından kullanılmaz)

Yeni geliştirmelerde önerilen yol: **`repro_dashboard/` kökündeki Next.js uygulaması**.

## 🛠️ Sık karşılaşılan sorunlar

- **Prisma client hataları / “Cannot read properties of undefined … findMany”**:

```bash
npx prisma generate
```

- **DB ayağa kalkmıyor**: Docker Desktop’ın açık olduğundan emin olun ve:

```bash
docker-compose up -d db
```

## 🔒 Üretim notları (kısa)

- `NEXTAUTH_SECRET` üretimde **uzun ve rastgele** olmalı
- `DATABASE_URL` üretim DB’ye işaret etmeli
- Seed kullanıcıları üretimde kullanmayın (veya seed’i prod’da çalıştırmayın)

## 📄 License

Proprietary – All rights reserved.
