'use client';

import { getDaysLeft, getDueBadgeVariant } from '@/lib/due-date';
import { cn } from '@/lib/utils';

const VARIANT_CLASSES: Record<string, string> = {
  green: 'bg-green-100 text-green-800 border-green-200',
  blue: 'bg-blue-100 text-blue-800 border-blue-200',
  yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  orange: 'bg-orange-100 text-orange-800 border-orange-200',
  red: 'bg-red-100 text-red-800 border-red-200',
  gray: 'bg-gray-100 text-gray-600 border-gray-200',
};

export function DueBadge({
  dueDate,
  className,
}: {
  dueDate?: string | Date | null;
  className?: string;
}) {
  const daysLeft = getDaysLeft(dueDate ?? undefined);
  const variant = getDueBadgeVariant(daysLeft);

  if (dueDate == null || dueDate === '') {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded px-2 py-1 text-xs font-medium border',
          VARIANT_CLASSES.gray,
          className
        )}
      >
        Termin yok
      </span>
    );
  }

  const variantClasses = VARIANT_CLASSES[variant] ?? VARIANT_CLASSES.gray;
  const label =
    Number.isNaN(daysLeft)
      ? 'Termin yok'
      : daysLeft < 0
        ? `${Math.abs(daysLeft)} gün gecikti`
        : `${daysLeft} gün kaldı`;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-2 py-1 text-xs font-medium border',
        variantClasses,
        className
      )}
    >
      {label}
    </span>
  );
}
