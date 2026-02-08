'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { Hand, ArrowRight, RotateCcw, Loader2 } from 'lucide-react';

export type PreReproFileForActions = {
  id: string;
  assignedDesignerId: string | null;
  targetAssigneeId: string | null;
  assignedDesigner?: { fullName: string } | null;
  /** PRE_REPRO to show buttons; omit or other value to hide */
  stage?: string | null;
};

type FileActionButtonsProps = {
  file: PreReproFileForActions;
  currentUserId: string;
  /** Optional: use "sm" for list/cards, default for detail header */
  size?: 'default' | 'sm' | 'lg' | 'icon';
  /** When true, do not show Devral button (e.g. on file detail page for Ön Repro – claim only from queue) */
  hideClaimButton?: boolean;
};

export function FileActionButtons({
  file,
  currentUserId,
  size = 'sm',
  hideClaimButton = false,
}: FileActionButtonsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<'devral' | 'devret' | 'return' | null>(null);

  // Only show pre-repro actions when file is in PRE_REPRO stage
  if (file.stage != null && file.stage !== 'PRE_REPRO') {
    return null;
  }

  const fileId = file.id;
  const assignedDesignerId = file.assignedDesignerId ?? null;
  const claimedByFullName = file.assignedDesigner?.fullName;

  const handleDevral = async () => {
    setLoading('devral');
    try {
      const res = await fetch(`/api/files/${fileId}/pre-repro/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error?.message ?? 'Devral işlemi başarısız');
      }
      toast({ title: 'Başarılı', description: 'Dosyayı devraldınız' });
      router.refresh();
    } catch (err) {
      toast({
        title: 'Hata',
        description: err instanceof Error ? err.message : 'Devral işlemi başarısız',
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
    }
  };

  const handleDevret = async () => {
    setLoading('devret');
    try {
      const res = await fetch(`/api/files/${fileId}/pre-repro/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error?.message ?? 'Devret işlemi başarısız');
      }
      toast({ title: 'Başarılı', description: 'Dosya hedef kişiye devredildi' });
      router.refresh();
    } catch (err) {
      toast({
        title: 'Hata',
        description: err instanceof Error ? err.message : 'Devret işlemi başarısız',
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
    }
  };

  const handleReturn = async () => {
    setLoading('return');
    try {
      const res = await fetch(`/api/files/${fileId}/pre-repro/return-to-queue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error?.message ?? 'Geri kuyruğa atma başarısız');
      }
      toast({ title: 'Başarılı', description: 'Dosya tekrar kuyruğa alındı' });
      router.refresh();
    } catch (err) {
      toast({
        title: 'Hata',
        description: err instanceof Error ? err.message : 'Geri kuyruğa atma başarısız',
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
    }
  };

  if (assignedDesignerId == null) {
    if (hideClaimButton) {
      return null;
    }
    return (
      <Button
        onClick={handleDevral}
        disabled={loading !== null}
        size={size}
        variant="outline"
      >
        {loading === 'devral' ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <Hand className="mr-1 h-4 w-4" />
            Devral
          </>
        )}
      </Button>
    );
  }

  if (assignedDesignerId !== currentUserId) {
    return (
      <span className="text-sm text-muted-foreground">
        Başka biri devraldı{claimedByFullName ? ` (${claimedByFullName})` : ''}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Button
        onClick={handleDevret}
        disabled={loading !== null}
        size={size}
      >
        {loading === 'devret' ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <ArrowRight className="mr-1 h-4 w-4" />
            Devret
          </>
        )}
      </Button>
      <Button
        onClick={handleReturn}
        disabled={loading !== null}
        size={size}
        variant="outline"
      >
        {loading === 'return' ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <RotateCcw className="mr-1 h-4 w-4" />
            Geri Kuyruğa
          </>
        )}
      </Button>
    </div>
  );
}
