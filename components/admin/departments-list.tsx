'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Department {
  id: string;
  name: string;
  code: string;
}

interface FileCount {
  departmentId: string;
  departmentName: string;
  departmentCode: string;
  total: number;
  breakdown: {
    acik: number;
    devam: number;
    bitti: number;
  };
}

interface DepartmentsListProps {
  departments: Department[];
  /** When provided (e.g. from Server Component), no client-side fetch needed */
  initialFileCounts?: FileCount[];
}

export function DepartmentsList({ departments, initialFileCounts }: DepartmentsListProps) {
  const [fileCounts, setFileCounts] = useState<FileCount[] | null>(initialFileCounts ?? null);
  const [loading, setLoading] = useState(!initialFileCounts);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (initialFileCounts) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/departments/file-counts', { cache: 'no-store' });
        const json = await res.json();
        if (!cancelled) {
          if (json.success && json.data) {
            setFileCounts(json.data);
            setError(false);
          } else {
            setError(true);
          }
        }
      } catch {
        if (!cancelled) {
          setError(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialFileCounts]);

  // Create a map for quick lookup
  const countsMap = new Map<string, FileCount>();
  if (fileCounts) {
    fileCounts.forEach((count) => {
      countsMap.set(count.departmentId, count);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Departmanlar
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {departments.map((d) => {
            const counts = countsMap.get(d.id);
            const total = counts?.total ?? null;
            const breakdown = counts?.breakdown;

            return (
              <li
                key={d.id}
                className="flex justify-between items-center py-2 border-b last:border-0"
              >
                <div className="flex items-center gap-2 flex-1 flex-wrap">
                  <span>
                    {d.name}
                    {loading ? (
                      <span className="text-sm text-muted-foreground ml-2 animate-pulse">
                        ...
                      </span>
                    ) : error || total === null ? (
                      <span className="text-sm text-muted-foreground ml-2">—</span>
                    ) : (
                      <span className="text-sm text-muted-foreground ml-2">
                        — {total} dosya
                      </span>
                    )}
                  </span>
                  {!loading && !error && total !== null && breakdown && (
                    <span className="text-xs text-muted-foreground">
                      (Açık: {breakdown.acik} / Devam: {breakdown.devam} / Bitti: {breakdown.bitti})
                    </span>
                  )}
                </div>
                <Badge variant="outline">{d.code}</Badge>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
