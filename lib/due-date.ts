/**
 * Termin (due date) hesaplama ve badge varyantı.
 * Referans: client-side "şu an" (new Date()).
 */

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Kalan gün sayısı: ceil((dueDate - now) / MS_PER_DAY).
 * Bugün termin = 0, geçmiş termin = negatif.
 */
export function getDaysLeft(dueDate: Date | string | null | undefined): number {
  if (dueDate == null) return NaN;
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return NaN;
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  return Math.ceil(diffMs / MS_PER_DAY);
}

export type DueBadgeVariant = 'green' | 'blue' | 'yellow' | 'orange' | 'red' | 'gray';

/**
 * Kalan güne göre badge rengi:
 * - >= 7: green
 * - 5–6: blue
 * - 3–4: yellow
 * - 2: orange
 * - < 2 (0, 1) veya geçmiş: red
 * - dueDate yok: gray
 */
export function getDueBadgeVariant(daysLeft: number): DueBadgeVariant {
  if (Number.isNaN(daysLeft)) return 'gray';
  if (daysLeft >= 7) return 'green';
  if (daysLeft >= 5) return 'blue';
  if (daysLeft >= 3) return 'yellow';
  if (daysLeft >= 2) return 'orange';
  return 'red';
}
