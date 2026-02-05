'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { ArrowRight, Loader2 } from 'lucide-react';

export function PreReproDevretButton({ fileId }: { fileId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDevret = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/files/${fileId}/pre-repro/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error?.message ?? 'Devret işlemi başarısız');
      }

      toast({
        title: 'Başarılı',
        description: 'Dosya hedef kişiye devredildi',
      });
      router.refresh();
    } catch (err) {
      toast({
        title: 'Hata',
        description: err instanceof Error ? err.message : 'Devret işlemi başarısız',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleDevret} disabled={loading} size="sm">
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          <ArrowRight className="mr-1 h-4 w-4" />
          Devret
        </>
      )}
    </Button>
  );
}
