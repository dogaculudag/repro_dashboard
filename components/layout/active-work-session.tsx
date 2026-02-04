'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { formatDuration, formatDurationFromMinutes } from '@/lib/utils';
import { Clock, StopCircle } from 'lucide-react';

type TimeEntryActive = {
  id: string;
  fileId: string;
  file: { fileNo: string; customerName: string };
  department: { name: string; code: string };
  startAt: string;
  durationSeconds: number;
  isActive: boolean;
};

type WorkSessionActive = {
  id: string;
  fileId: string;
  file: { fileNo: string; customerName: string };
  department: { name: string; code: string };
  startTime: string;
  durationMinutes: number;
  isActive: boolean;
};

export function ActiveWorkSessionBanner() {
  const router = useRouter();
  const [timeEntry, setTimeEntry] = useState<TimeEntryActive | null>(null);
  const [workSession, setWorkSession] = useState<WorkSessionActive | null>(null);
  const [loading, setLoading] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [elapsedMinutes, setElapsedMinutes] = useState(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [timeRes, workRes] = await Promise.all([
          fetch('/api/time/my-active'),
          fetch('/api/work-sessions/active'),
        ]);
        const timeJson = await timeRes.json();
        const workJson = await workRes.json();
        if (mounted) {
          if (timeJson.success && timeJson.data) {
            setTimeEntry(timeJson.data);
            setElapsedSeconds(timeJson.data.durationSeconds ?? 0);
            setWorkSession(null);
          } else if (workJson.success && workJson.data) {
            setWorkSession(workJson.data);
            setElapsedMinutes(workJson.data.durationMinutes ?? 0);
            setTimeEntry(null);
          } else {
            setTimeEntry(null);
            setWorkSession(null);
          }
        }
      } catch {
        if (mounted) {
          setTimeEntry(null);
          setWorkSession(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (timeEntry?.isActive) {
      const t = setInterval(() => setElapsedSeconds((e) => e + 1), 1000);
      return () => clearInterval(t);
    }
    if (workSession?.isActive) {
      const t = setInterval(() => setElapsedMinutes((e) => e + 1), 60_000);
      return () => clearInterval(t);
    }
  }, [timeEntry?.isActive, workSession?.isActive]);

  const handleStop = async () => {
    try {
      await Promise.all([
        fetch('/api/time/stop', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }),
        fetch('/api/work-sessions/stop', { method: 'POST' }),
      ]);
      setTimeEntry(null);
      setWorkSession(null);
      router.refresh();
    } catch {
      // ignore
    }
  };

  const session = timeEntry ?? workSession;
  if (loading || !session) return null;

  const fileId = session.fileId;
  const file = session.file;
  const durationDisplay = timeEntry
    ? formatDuration(elapsedSeconds)
    : formatDurationFromMinutes(elapsedMinutes);

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Clock className="h-5 w-5 text-amber-600" />
          <span className="text-sm font-medium text-amber-900">
            Şu an çalışıyorsunuz:{' '}
            <Link
              href={`/dashboard/files/${fileId}`}
              className="underline hover:no-underline"
            >
              {file.fileNo}
            </Link>
            {' — '}
            {file.customerName}
          </span>
          <span className="text-sm text-amber-700">({durationDisplay})</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-amber-300 text-amber-800 hover:bg-amber-100"
          onClick={handleStop}
        >
          <StopCircle className="mr-1 h-4 w-4" />
          Çalışmayı durdur
        </Button>
      </div>
    </div>
  );
}
