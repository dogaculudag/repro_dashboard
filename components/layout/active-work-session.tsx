'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { formatDurationFromMinutes } from '@/lib/utils';
import { Clock, StopCircle } from 'lucide-react';

interface ActiveSession {
  id: string;
  fileId: string;
  file: { fileNo: string; customerName: string };
  department: { name: string; code: string };
  startTime: string;
  durationMinutes: number;
  isActive: boolean;
}

export function ActiveWorkSessionBanner() {
  const router = useRouter();
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/work-sessions/active');
        const json = await res.json();
        if (mounted && json.success && json.data) {
          setSession(json.data);
          setElapsed(json.data.durationMinutes ?? 0);
        } else {
          setSession(null);
        }
      } catch {
        if (mounted) setSession(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!session?.isActive) return;
    const t = setInterval(() => {
      setElapsed((e) => e + 1);
    }, 60_000);
    return () => clearInterval(t);
  }, [session?.isActive]);

  const handleStop = async () => {
    try {
      const res = await fetch('/api/work-sessions/stop', { method: 'POST' });
      if (res.ok) {
        setSession(null);
        router.refresh();
      }
    } catch {
      // ignore
    }
  };

  if (loading || !session) return null;

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Clock className="h-5 w-5 text-amber-600" />
          <span className="text-sm font-medium text-amber-900">
            Şu an çalışıyorsunuz:{' '}
            <Link
              href={`/dashboard/files/${session.fileId}`}
              className="underline hover:no-underline"
            >
              {session.file.fileNo}
            </Link>
            {' — '}
            {session.file.customerName}
          </span>
          <span className="text-sm text-amber-700">
            ({formatDurationFromMinutes(elapsed)})
          </span>
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
