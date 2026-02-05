'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { RotateCcw, Loader2 } from 'lucide-react';

export function PreReproReturnButton({ fileId }: { fileId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleReturn = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/files/${fileId}/pre-repro/return-to-queue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error?.message ?? 'Geri kuyruğa atma başarısız');
      }

      toast({
        title: 'Başarılı',
        description: 'Dosya tekrar kuyruğa alındı',
      });
      router.refresh();
    } catch (err) {
      toast({
        title: 'Hata',
        description: err instanceof Error ? err.message : 'Geri kuyruğa atma başarısız',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleReturn} disabled={loading} size="sm" variant="outline">
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          <RotateCcw className="mr-1 h-4 w-4" />
          Geri Kuyruğa
        </>
      )}
    </Button>
  );
}
