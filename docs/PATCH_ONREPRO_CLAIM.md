# Patch: Ön Repro Devral (Claim) Düzeltmesi

## 1) Kök Neden Analizi

| Katman | Durum | Açıklama |
|--------|--------|-----------|
| **Backend** | ✅ Endpoint var | `POST /api/files/[id]/pre-repro/claim` mevcut, auth (ONREPRO/ADMIN) ve hata kodları doğru. |
| **Concurrency** | ❌ Bug | `claimPreRepro` önce `getFileById` ile okuyup `assignedDesignerId == null` kontrolü yapıyor, sonra `update({ where: { id } })` atıyordu. İki kullanıcı aynı anda devral’a basınca ikisi de “null” görüp ikisi de update yapabiliyordu (yarış). |
| **DB** | ✅ | `File.assignedDesignerId` nullable, stage PRE_REPRO, seed’de null. |
| **Frontend** | ✅ Küçük iyileştirme | Devral sonrası `router.refresh()` zaten vardı; API 4xx/5xx’te `data.error?.message` her zaman parse edilmiyordu. Ayrıca sunucu cache’i için `revalidatePath` yoktu. |

**Özet:** Ana sebep **atomic olmayan claim** (read-then-write race). İkincil: claim sonrası cache invalidation’ın sadece client’ta `router.refresh()` ile yapılması; API tarafında `revalidatePath` eklenmesi daha güvenli.

---

## 2) Yapılan Kod Değişiklikleri (Patch Özeti)

### Backend

**Dosya: `lib/services/file.service.ts`**

- `claimPreRepro` içinde:
  - Update koşulu **atomic** yapıldı: `where: { id: fileId, assignedDesignerId: null }`. Böylece aynı anda iki istek gelse bile sadece biri güncelleme yapar; diğeri P2025 alır.
  - P2025 (Record to update not found) yakalanıp “Dosya zaten başka biri tarafından devralınmış” hatası fırlatılıyor.
  - Audit log, transaction içinde `tx.auditLog.create` ile yazılıyor (atomic).

**Dosya: `app/api/files/[id]/pre-repro/claim/route.ts`**

- Başarılı claim sonrası `revalidatePath('/dashboard/queues/pre-repro')` eklendi.
- Mevcut hata dönüşleri (404, 409, 422, 500) ve yetki (ONREPRO/ADMIN) aynen kaldı.

### Frontend

**Dosya: `components/files/file-action-buttons.tsx`**

- `handleDevral` içinde: `res.json().catch(() => ({}))` ile boş body hataları önleniyor.
- `!res.ok` durumunda toast’ta `data?.error?.message` veya `Sunucu hatası (status)` gösteriliyor.
- Devral butonu zaten `disabled={loading !== null}` ve loading ikonu kullanıyor.

**Dosya: `app/dashboard/queues/pre-repro/pre-repro-devral-button.tsx`**

- Aynı hata mesajı iyileştirmesi: API’den gelen mesaj toast’ta gösteriliyor.

---

## 3) Devral Endpoint Güvenliği

- **Yetki:** Sadece `role === 'ONREPRO'` veya `role === 'ADMIN'` (session’dan). Diğer roller 403.
- **Yarış durumu:** Update artık `where: { id, assignedDesignerId: null }` ile atomic; çift devral engellendi.
- **Stage/status:** Sadece PRE_REPRO ve assignee null iken güncelleme yapılıyor; stage/status değişmiyor (Ön Repro’da kalıyor).

---

## 4) UI Davranışı

- Devral tıklanınca buton **disabled** ve **loading** (spinner).
- Başarı: “Başarılı – Dosyayı devraldınız” toast + `router.refresh()` ile liste güncellenir.
- Hata: “Hata” toast + API’den gelen mesaj (veya “Devral işlemi başarısız” / “Sunucu hatası (4xx/5xx)”).

---

## 5) Dev Ortamında Hızlı Test Adımları

1. **Ortamı aç**
   - `.\start-local.ps1` veya `npm run dev` + DB (docker-compose up -d db).
   - Gerekirse: `npm run db:seed-reset-files` ile PRE_REPRO dosyaları oluştur.

2. **Ön Repro kuyruğuna gir**
   - ONREPRO veya ADMIN ile giriş (örn. seed’deki kullanıcı).
   - `/dashboard/queues/pre-repro` sayfasına git.

3. **Tek kullanıcı devral**
   - Bir dosyada “Devral”a tıkla.
   - Beklenen: Loading → “Dosyayı devraldınız” toast, satırda artık “Devret” / “Geri Kuyruğa” görünür, listede güncelleme.

4. **Çift devral (concurrency)**
   - İki tarayıcı (veya iki sekme) aynı ONREPRO/ADMIN hesabıyla aç (veya iki farklı ONREPRO kullanıcı).
   - Aynı dosyada neredeyse aynı anda “Devral”a bas.
   - Beklenen: Biri başarılı, diğeri “Dosya zaten başka biri tarafından devralınmış” (409) toast.

5. **Yetkisiz kullanıcı**
   - REPRO veya başka rol ile giriş yap, `/dashboard/queues/pre-repro` erişimi yok veya devral 403.
   - Beklenen: Sayfa redirect veya API 403.

6. **Zaten devralınmış dosya**
   - Bir dosyayı A kullanıcısı devraldı. B kullanıcısı (veya aynı kullanıcı başka sekmede) aynı dosyada Devral’a basarsa (eğer UI buna izin veriyorsa) API 409 döner; toast’ta “Dosya zaten başka biri tarafından devralınmış” görünür.

Bu adımlar devral’ın doğru çalıştığını, UI’ın güncellendiğini ve concurrency’nin engellendiğini doğrular.
