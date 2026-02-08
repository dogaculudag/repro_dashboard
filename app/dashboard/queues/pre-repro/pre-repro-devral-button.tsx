'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { Hand, Loader2 } from 'lucide-react';

export function PreReproDevralButton({ fileId }: { fileId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDevral = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/files/${fileId}/pre-repro/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          (data?.error?.message as string) || `Sunucu hatası (${res.status})`
        );
      }
      if (!data.success) {
        throw new Error(
          (data?.error?.message as string) || 'Devral işlemi başarısız'
        );
      }
      toast({
        title: 'Başarılı',
        description: 'Dosyayı devraldınız',
      });
      router.refresh();
    } catch (err) {
      toast({
        title: 'Hata',
        description: err instanceof Error ? err.message : 'Devral işlemi başarısız',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleDevral} disabled={loading} size="sm" variant="outline">
      {loading ? (
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
