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

export type DueSortMode = 'NEAREST' | 'FARTHEST';

const now = () => new Date();

/**
 * Sıralama için tier: null en sonda, overdue/future tier'a göre.
 * NEAREST: null last, then dueDate asc (overdue first, then nearest future).
 * FARTHEST: future first (dueDate desc), then overdue, then null last.
 */
export function sortByDueDate<T>(
  files: T[],
  getDueDate: (f: T) => Date | string | null | undefined,
  mode: DueSortMode
): T[] {
  const n = now();
  const toTime = (d: Date | string | null | undefined): number => {
    if (d == null) return NaN;
    const t = new Date(d).getTime();
    return Number.isNaN(t) ? NaN : t;
  };
  return [...files].sort((a, b) => {
    const da = getDueDate(a);
    const ta = toTime(da);
    const tb = toTime(getDueDate(b));
    const aNull = Number.isNaN(ta);
    const bNull = Number.isNaN(tb);
    if (aNull && bNull) return 0;
    if (aNull) return 1;
    if (bNull) return -1;
    const aOverdue = ta < n.getTime();
    const bOverdue = tb < n.getTime();
    if (mode === 'NEAREST') {
      if (aOverdue && bOverdue) return ta - tb;
      if (aOverdue) return -1;
      if (bOverdue) return 1;
      return ta - tb;
    }
    // FARTHEST: future first (desc), then overdue, then null (already handled)
    if (!aOverdue && !bOverdue) return tb - ta;
    if (!aOverdue) return -1;
    if (!bOverdue) return 1;
    return tb - ta;
  });
}
