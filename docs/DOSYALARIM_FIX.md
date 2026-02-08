# Dosyalarım – Root Cause ve Patch Özeti

## 1) Root cause (kanıtlı)

- **Devral (claim)** endpoint'i `assignedDesignerId` alanını set ediyor (`claimPreRepro` → `data: { assignedDesignerId: userId }`). Stage PRE_REPRO kalıyor.
- **Devret (complete)** endpoint'i aynı alanı set ediyor: `assignedDesignerId: toAssigneeId`, stage REPRO'ya geçiyor.
- **Dosyalarım** ekranı `getDesignerFiles(designerId)` ile veri alıyordu ve bu fonksiyon **hem** `assignedDesignerId: designerId` **hem de** `stage: Stage.REPRO` ile filtreliyordu.

**Net cümle:** Devral işlemi `assignedDesignerId`'yi set ediyor (doğru alan), fakat Dosyalarım sorgusu aynı alana ek olarak `stage: REPRO` şartı koyduğu için PRE_REPRO’daki (devralınan) dosyalar listede hiç görünmüyordu.

Tek kaynak: **File.assignedDesignerId**. Stage filtresi kaldırıldı.

---

## 2) Patch – Hangi dosyada hangi satır değişti

| Dosya | Değişiklik |
|-------|------------|
| `lib/services/file.service.ts` | `getDesignerFiles`: `stage: Stage.REPRO` kaldırıldı; yalnızca `assignedDesignerId` + `status not SENT_TO_PRODUCTION`. JSDoc güncellendi. |
| `app/api/files/[id]/pre-repro/claim/route.ts` | `revalidatePath('/dashboard/queue')` eklendi. |
| `app/api/files/[id]/pre-repro/complete/route.ts` | `revalidatePath` import; `revalidatePath('/dashboard/queues/pre-repro')` ve `revalidatePath('/dashboard/queue')` eklendi. |
| `app/api/files/[id]/pre-repro/return-to-queue/route.ts` | `revalidatePath` import; `revalidatePath('/dashboard/queues/pre-repro')` ve `revalidatePath('/dashboard/queue')` eklendi. |
| `app/dashboard/queue/page.tsx` | GRAFIKER için bölümleme: `activeFiles` = timer’ı olanlar, `pendingTakeover` = timer’ı olmayanlar (PRE_REPRO devralınan dosyalar da burada görünür). |

---

## 3) DB migration

Gerek yok. Şema zaten tek alan kullanıyor: `File.assignedDesignerId`. `ownerId` / `currentHandlerId` / `assignedToId` kullanılmıyor.

---

## 4) Test adımları

1. **Seed ile 2 dosya (assignee null)**  
   Mevcut seed’de zaten `assignedDesignerId: null`, `stage: PRE_REPRO`, `status: AWAITING_ASSIGNMENT` dosyalar var. İstersen `prisma/seed-reset-files.ts` veya seed’deki “awaiting assignment” kısmı ile 2 dosya üret.

2. **Kullanıcı A dosya1’i devral → Dosyalarımda gör**  
   - A ile giriş yap → Ön Repro kuyruğu → Dosya1’e “Devral” → Dosyalarım sayfasına git.  
   - Beklenen: Dosya1 listede görünür (timer yoksa “Devir Bekliyor” bölümünde).

3. **Kullanıcı A dosya1’i B’ye devret → A’dan çıksın, B’de görünsün**  
   - A ile Dosya1’e “Devret” (hedef B veya Bahar).  
   - A’nın Dosyalarım’ında Dosya1 kaybolur.  
   - B ile giriş yap → Dosyalarım’da Dosya1 görünür.

4. **Farklı stage’lerde de Dosyalarımda görünsün**  
   - PRE_REPRO (devralındı), REPRO (devredildi/atanmış), IN_QUALITY vb. tüm stage’lerde `assignedDesignerId = currentUser.id` olan dosyalar artık `getDesignerFiles` ile gelir; ekstra stage filtresi yok.
