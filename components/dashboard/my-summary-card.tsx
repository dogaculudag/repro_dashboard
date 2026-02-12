'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock } from 'lucide-react';

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}s ${m}dk`;
  return `${m}dk`;
}

type Summary = {
  from: string | Date;
  to: string | Date;
  totalSeconds: number;
  totalHours: number;
  weightedScore: number;
  productivity: number;
  breakdownByFileType: Array<{ fileTypeId: string; fileTypeName: string; totalSeconds: number; weightedScore: number }>;
  breakdownByDepartment: Array<{ departmentId: string; name: string; code: string; totalSeconds: number }>;
};

interface MySummaryCardProps {
  /** When provided (e.g. from Server Component), no client-side fetch needed */
  initialSummary?: Summary | null;
}

export function MySummaryCard({ initialSummary }: MySummaryCardProps = {}) {
  const [summary, setSummary] = useState<Summary | null>(initialSummary ?? null);
  const [loading, setLoading] = useState(!initialSummary);

  useEffect(() => {
    if (initialSummary) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/time/my-summary?period=week', { cache: 'no-store' });
        const json = await res.json();
        if (!cancelled && json.success && json.data) {
          setSummary(json.data);
        }
      } catch {
        if (!cancelled) setSummary(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [initialSummary]);

  if (loading || !summary) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          Bu hafta süre özeti
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatDuration(summary.totalSeconds)}</div>
        <p className="text-xs text-muted-foreground">
          Ağırlıklı puan: {summary.weightedScore.toFixed(2)} · Üretkenlik: {summary.productivity.toFixed(2)}
        </p>
        {summary.breakdownByFileType.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs font-medium text-muted-foreground mb-1">Dosya tipi kırılımı</p>
            <ul className="text-xs space-y-0.5">
              {summary.breakdownByFileType.map((b) => (
                <li key={b.fileTypeId}>
                  {b.fileTypeName}: {formatDuration(b.totalSeconds)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
