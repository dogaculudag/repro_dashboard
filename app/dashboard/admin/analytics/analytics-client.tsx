'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight } from 'lucide-react';

type UserRow = {
  userId: string;
  userName: string;
  fullName: string;
  totalTimeSeconds: number;
  totalFilesWorked: number;
  weightedScore: number;
  productivity: number;
  breakdownByFileType: Array<{ fileTypeId: string; name: string; totalTimeSeconds: number; weightedScore: number }>;
  breakdownByDepartment: Array<{ departmentId: string; departmentName: string; departmentCode: string; totalTimeSeconds: number }>;
};

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}s ${m}dk`;
  return `${m}dk`;
}

export function AnalyticsClient({
  initialData,
  initialFrom,
  initialTo,
}: {
  initialData: UserRow[];
  initialFrom: string;
  initialTo: string;
}) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [from, setFrom] = useState(initialFrom.slice(0, 10));
  const [to, setTo] = useState(initialTo.slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleApply = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/analytics/users?from=${from}&to=${to}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Başlangıç</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Bitiş</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="border rounded px-3 py-2"
          />
        </div>
        <Button onClick={handleApply} disabled={loading}>
          Uygula
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="w-8" />
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Kullanıcı</th>
              <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Toplam süre</th>
              <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Dosya sayısı</th>
              <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Ağırlıklı puan</th>
              <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Üretkenlik</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <React.Fragment key={row.userId}>
                <tr
                  className="border-t border-gray-200 hover:bg-gray-50"
                >
                  <td className="px-2 py-2">
                    {(row.breakdownByFileType.length > 0 || row.breakdownByDepartment.length > 0) && (
                      <button
                        type="button"
                        onClick={() => setExpandedId(expandedId === row.userId ? null : row.userId)}
                        className="p-0.5"
                      >
                        {expandedId === row.userId ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-2 text-sm font-medium text-gray-900">
                    {row.fullName} ({row.userName})
                  </td>
                  <td className="px-4 py-2 text-sm text-right">{formatDuration(row.totalTimeSeconds)}</td>
                  <td className="px-4 py-2 text-sm text-right">{row.totalFilesWorked}</td>
                  <td className="px-4 py-2 text-sm text-right">{row.weightedScore.toFixed(2)}</td>
                  <td className="px-4 py-2 text-sm text-right">{row.productivity.toFixed(2)}</td>
                </tr>
                {expandedId === row.userId && (
                  <tr key={`${row.userId}-detail`} className="bg-gray-50">
                    <td colSpan={6} className="px-4 py-3">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <p className="text-xs font-medium text-gray-600 mb-2">Dosya tipi kırılımı</p>
                          <ul className="text-sm space-y-1">
                            {row.breakdownByFileType.length === 0 ? (
                              <li className="text-muted-foreground">—</li>
                            ) : (
                              row.breakdownByFileType.map((b) => (
                                <li key={b.fileTypeId}>
                                  {b.name}: {formatDuration(b.totalTimeSeconds)} (puan: {b.weightedScore.toFixed(2)})
                                </li>
                              ))
                            )}
                          </ul>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-600 mb-2">Departman kırılımı</p>
                          <ul className="text-sm space-y-1">
                            {row.breakdownByDepartment.length === 0 ? (
                              <li className="text-muted-foreground">—</li>
                            ) : (
                              row.breakdownByDepartment.map((b) => (
                                <li key={b.departmentId}>
                                  {b.departmentName} ({b.departmentCode}): {formatDuration(b.totalTimeSeconds)}
                                </li>
                              ))
                            )}
                          </ul>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
      {data.length === 0 && (
        <p className="text-center text-muted-foreground py-8">Seçilen aralıkta kayıt yok.</p>
      )}
    </div>
  );
}
