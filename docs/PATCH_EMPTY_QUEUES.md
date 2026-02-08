# Patch: Atama Havuzu ve Ön Repro Kuyruğu Boş Sorunu

## Kök Neden (Kanıtlı)

**Ana sebep:** `prisma/seed.ts` hiçbir `File` kaydında `stage` alanını set etmiyordu. Schema’da `File.stage` optional (`Stage?`); create/upsert’te verilmediği için tüm dosyalar **stage = NULL** kalıyordu.

**Sonuç:**

- **Ön Repro kuyruğu:** `getPreReproQueue()` filtresi `where: { stage: Stage.PRE_REPRO }` → DB’de stage = PRE_REPRO olan kayıt yok → **0 satır**.
- **Atama havuzu:** `listFiles({ stage: 'REPRO', assignedDesignerId: session.user.id })` → stage = REPRO olan kayıt yok → **0 satır**.

Docker `down -v` sonrası sadece `npm run db:seed` çalıştırıldığında tablolar dolu olsa bile `stage` hep NULL olduğu için her iki ekran da boş görünüyordu.

**Veri → API sırası:** DB’de stage NULL → API filtreleri PRE_REPRO / REPRO arıyor → liste boş. UI tarafında ek bir hata yok; endpoint’ler ve filtreler doğru.

---

## Yapılan Kod Değişiklikleri (Patch Özeti)

### 1) Geçici debug log (root-cause doğrulama)

| Dosya | Değişiklik |
|-------|------------|
| **`app/api/assignments/pool/route.ts`** | `prisma` import; GET içinde `prisma.file.count()` ve `prisma.file.groupBy({ by: ['stage'], _count: true })` ile toplam kayıt ve stage dağılımı `console.log` (DEBUG etiketiyle). |
| **`app/api/queues/pre-repro/route.ts`** | Aynı debug: toplam File sayısı + stage dağılımı loglanıyor. |

Sunucu logunda örnek: `[DEBUG /api/assignments/pool] File total: 55 byStage: [{"stage":null,"_count":55}]` → tüm kayıtların stage’i null olduğu görülür. Düzeltme sonrası `PRE_REPRO`, `REPRO`, `DONE` dağılımı görünecek.

### 2) seed.ts – stage ataması ve Bahar havuzu

| Dosya | Satır / Bölüm | Değişiklik |
|-------|----------------|------------|
| **`prisma/seed.ts`** | import | `Stage` enum import edildi. |
| | File 1 (REP-2026-0001) | create/update: `stage: Stage.PRE_REPRO` eklendi (Ön Repro’da görünür). |
| | File 2 (REP-2026-0002) | create/update: `stage: Stage.REPRO` eklendi. |
| | File 3 (REP-2026-0003) | create/update: `stage: Stage.PRE_REPRO` eklendi. |
| | File 4 (REP-2026-0004) | create/update: `stage: Stage.REPRO` eklendi. |
| | File 5 (REP-2026-0005) | create/update: `stage: Stage.REPRO` eklendi. |
| | File 6 (REP-2026-0006) | create/update: `stage: Stage.DONE` eklendi. |
| | 34 ek dosya döngüsü | `stageForExtra`: ONREPRO → `PRE_REPRO`, SENT_TO_PRODUCTION → `DONE`, diğer → `REPRO`. create/update’e `stage: stageForExtra` eklendi. |
| | 15 “atama bekleyen” dosya | create/update: `stage: Stage.PRE_REPRO` eklendi. |
| | Yeni blok | **3 adet “Bahar atama havuzu” dosyası:** REP-2026-0056, 0057, 0058; `stage: Stage.REPRO`, `assignedDesignerId: userMap.bahar.id`, `status: ASSIGNED`, `pendingTakeover: true`. |

Böylece:

- **Ön Repro kuyruğu:** PRE_REPRO stage’li dosyalar (örn. 1, 3, 15 atama bekleyen + 34’lük döngüde ONREPRO olanlar) listelenir.
- **Atama havuzu:** Bahar ile girişte stage=REPRO ve assignedDesignerId=Bahar olan 3 dosya listelenir.

---

## DATABASE_URL Kontrolü

- **docker-compose.yml:** `DATABASE_URL=postgresql://postgres:postgres@db:5432/repro_tracking`
- **.env.example (local):** `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/repro_tracking"`

Local’de `npm run dev` ile çalışırken `.env` içinde `localhost:5432` kullanılmalı; container içinde çalışırken `db:5432` kullanılır. İkisi de aynı DB’yi (repro_tracking) işaret etmeli. Volume silindiyse migrate + seed tekrar çalıştırılmalı.

---

## Doğrulama: “Atama havuzu ve Ön Repro tekrar dolu”

1. **DB sıfırdan (örn. docker down -v sonrası):**
   ```bash
   cd repro_dashboard
   npm run db:push
   npm run db:seed
   ```
2. **Uygulama:** `npm run dev`
3. **Bahar ile giriş:** `bahar` / `password123`
4. **Atama havuzu:** `/dashboard/assignments` → En az **3 dosya** (REP-2026-0056, 0057, 0058) görünmeli.
5. **Ön Repro kuyruğu:** `/dashboard/queues/pre-repro` → **Çok sayıda PRE_REPRO dosyası** (örn. REP-2026-0001, 0003, 0041–0055 ve 34’lük döngüdeki ONREPRO’lar) görünmeli.
6. **Sunucu logu:** Bu sayfalar açılırken veya API çağrılarında `[DEBUG ...] File total: ... byStage: [...]` log’unda artık `PRE_REPRO`, `REPRO`, `DONE` dağılımı görünmeli; `null` sayısı 0 olmalı (veya sadece eski verilerde kalabilir).

Debug log’ları root-cause doğrulandıktan sonra kaldırılabilir (pool ve pre-repro route’larındaki `prisma.file.count` / `groupBy` ve `console.log` satırları).
