/**
 * KSM Teknik Verileri – çift katmanlı yapı (raw + normalized).
 * raw: VIEW'dan gelen ham veri (sadece sistem yazar).
 * normalized: Sabit alanlar (UI, PDF, analiz + manuel override).
 */

/** Ham veri + normalize edilmiş alanlar */
export interface KsmTechnicalData {
  raw?: Record<string, unknown>;
  normalized?: KsmNormalizedFields;
}

/** Normalized katmanda kullanılan sabit alanlar (hepsi nullable) */
export type KsmNormalizedFields = Partial<{
  // Kimlik & Referans
  source_ref_id: string;
  sap_no: string;
  design_no: string;
  revision_no: string;
  order_name: string;
  customer_name: string;
  project_code: string;
  // Boyut & Ölçü
  boy: string;
  cevre: string;
  net_baski_alani: string;
  malzeme_genisligi: string;
  bant_eni: string;
  bant_eni_tekrar: string;
  fotosel_boyu: string;
  fotosel_cevre: string;
  fotosel_adedi: string;
  // Malzeme & Baskı
  gmg_turu: string;
  baski_malzemesi: string;
  laminasyon_malzemesi: string;
  akis_yonu: string;
  kombine_sekli: string;
  montaj_plani: string;
  siparis_nedeni: string;
  // Baskı & Silindir
  gravur_baslangic_noktasi: string;
  test_atisi: string;
  silindir_tipi: string;
  silindir_sayisi: string;
  // Süreç & Departman
  departman: string;
  izlenebilirlik: string;
  referans: string;
  // Genel
  genel_aciklama: string;
}>;

/** Tüm normalized alan adları (sıra: gruplara göre) */
export const KSM_NORMALIZED_KEYS = [
  'source_ref_id',
  'sap_no',
  'design_no',
  'revision_no',
  'order_name',
  'customer_name',
  'project_code',
  'boy',
  'cevre',
  'net_baski_alani',
  'malzeme_genisligi',
  'bant_eni',
  'bant_eni_tekrar',
  'fotosel_boyu',
  'fotosel_cevre',
  'fotosel_adedi',
  'gmg_turu',
  'baski_malzemesi',
  'laminasyon_malzemesi',
  'akis_yonu',
  'kombine_sekli',
  'montaj_plani',
  'siparis_nedeni',
  'gravur_baslangic_noktasi',
  'test_atisi',
  'silindir_tipi',
  'silindir_sayisi',
  'departman',
  'izlenebilirlik',
  'referans',
  'genel_aciklama',
] as const;

export type KsmNormalizedKey = (typeof KSM_NORMALIZED_KEYS)[number];

/** UI grupları (label + keys) */
export const KSM_NORMALIZED_GROUPS: { label: string; keys: readonly KsmNormalizedKey[] }[] = [
  { label: 'Kimlik & Referans', keys: ['source_ref_id', 'sap_no', 'design_no', 'revision_no', 'order_name', 'customer_name', 'project_code'] },
  { label: 'Boyut & Ölçü', keys: ['boy', 'cevre', 'net_baski_alani', 'malzeme_genisligi', 'bant_eni', 'bant_eni_tekrar', 'fotosel_boyu', 'fotosel_cevre', 'fotosel_adedi'] },
  { label: 'Malzeme & Baskı', keys: ['gmg_turu', 'baski_malzemesi', 'laminasyon_malzemesi', 'akis_yonu', 'kombine_sekli', 'montaj_plani', 'siparis_nedeni'] },
  { label: 'Baskı & Silindir', keys: ['gravur_baslangic_noktasi', 'test_atisi', 'silindir_tipi', 'silindir_sayisi'] },
  { label: 'Süreç & Departman', keys: ['departman', 'izlenebilirlik', 'referans'] },
  { label: 'Genel', keys: ['genel_aciklama'] },
];

/** VIEW kolon adı -> normalized key. Aynı isimlerse identity; farklıysa burada eşle. */
const RAW_TO_NORMALIZED: Record<string, KsmNormalizedKey> = Object.fromEntries(
  KSM_NORMALIZED_KEYS.map((k) => [k, k])
) as Record<string, KsmNormalizedKey>;

/** Raw satırdan normalized obje üretir. Sadece bilinen alanlar kopyalanır. */
export function rawToNormalized(row: Record<string, unknown>): KsmNormalizedFields {
  const out: KsmNormalizedFields = {};
  for (const rawKey of Object.keys(row)) {
    const normalizedKey = RAW_TO_NORMALIZED[rawKey];
    if (normalizedKey) {
      const v = row[rawKey];
      out[normalizedKey as keyof KsmNormalizedFields] =
        v === null || v === undefined ? undefined : String(v);
    }
  }
  return out;
}

/** source_ref_id VIEW satırında hangi key ile geliyor (config) */
export const KSM_SOURCE_REF_ID_RAW_KEYS = ['source_ref_id', 'source_ref_id_ksm'] as const;

export function getSourceRefIdFromRaw(row: Record<string, unknown>): string | null {
  for (const key of KSM_SOURCE_REF_ID_RAW_KEYS) {
    const v = row[key];
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return null;
}
