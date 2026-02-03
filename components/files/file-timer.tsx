'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { formatDuration } from '@/lib/utils';
import { Play, Square } from 'lucide-react';

interface FileTimerProps {
  fileId: string;
}

export function FileTimer({ fileId }: FileTimerProps) {
  const router = useRouter();
  const [activeEntry, setActiveEntry] = useState<{
    id: string;
    fileId: string;
    file: { fileNo: string; customerName: string };
    durationSeconds: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/time/my-active');
        const json = await res.json();
        if (mounted && json.success && json.data) {
          setActiveEntry(json.data);
          setElapsed(json.data.durationSeconds ?? 0);
        } else {
          setActiveEntry(null);
        }
      } catch {
        if (mounted) setActiveEntry(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!activeEntry) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [activeEntry]);

  const handleStart = async () => {
    if (activeEntry) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/time/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId }),
      });
      const json = await res.json();
      if (json.success) {
        setActiveEntry({
          id: json.data.id,
          fileId: json.data.fileId,
          file: json.data.file,
          durationSeconds: 0,
        });
        setElapsed(0);
        router.refresh();
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleStop = async () => {
    if (!activeEntry || activeEntry.fileId !== fileId) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/time/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId }),
      });
      if (res.ok) {
        setActiveEntry(null);
        router.refresh();
      }
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return null;

  const isActiveOnThisFile = activeEntry?.fileId === fileId;
  const isActiveOnOther = activeEntry && !isActiveOnThisFile;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {isActiveOnOther && (
        <p className="text-sm text-amber-700">
          Aktif timer: {activeEntry.file.fileNo} — Önce onu durdurun veya bu dosyada başlatmak için durdurun.
        </p>
      )}
      {isActiveOnThisFile && (
        <>
          <span className="text-sm font-medium text-amber-800">
            Süre: {formatDuration(elapsed)}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleStop}
            disabled={actionLoading}
            className="border-amber-300 text-amber-800"
          >
            <Square className="mr-1 h-4 w-4" />
            Timer durdur
          </Button>
        </>
      )}
      {!activeEntry && (
        <Button
          size="sm"
          onClick={handleStart}
          disabled={actionLoading}
        >
          <Play className="mr-1 h-4 w-4" />
          Timer başlat
        </Button>
      )}
    </div>
  );
}
