'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import {
  KSM_NORMALIZED_GROUPS,
  type KsmNormalizedFields,
  type KsmNormalizedKey,
} from '@/lib/ksm-technical-data';
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';

function labelForKey(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

type Props = {
  fileId: string;
  initialNormalized?: KsmNormalizedFields | null;
  raw?: Record<string, unknown> | null;
  canEdit: boolean;
};

export function KsmTechnicalDataForm({ fileId, initialNormalized, raw, canEdit }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [rawOpen, setRawOpen] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});

  useEffect(() => {
    const init: Record<string, string> = {};
    const n = initialNormalized ?? {};
    for (const { keys } of KSM_NORMALIZED_GROUPS) {
      for (const k of keys) {
        const v = n[k as keyof KsmNormalizedFields];
        init[k] = v != null ? String(v) : '';
      }
    }
    setFormData(init);
  }, [initialNormalized]);

  const handleChange = (key: KsmNormalizedKey, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const normalized: Record<string, string | null> = {};
      for (const key of Object.keys(formData)) {
        const v = formData[key];
        normalized[key] = v?.trim() === '' ? null : (v?.trim() ?? null);
      }
      const res = await fetch(`/api/files/${fileId}/ksm-technical-data`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ normalized }),
      });
      const data = await res.json();
      if (!data.success) {
        toast({ title: 'Hata', description: data.error?.message ?? 'Kaydedilemedi', variant: 'destructive' });
        return;
      }
      toast({ title: 'Kaydedildi', description: 'KSM teknik verileri güncellendi.' });
      router.refresh();
    } catch (e) {
      toast({ title: 'Hata', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const hasNormalized = initialNormalized && Object.keys(initialNormalized).length > 0;
  const hasRaw = raw && Object.keys(raw).length > 0;
  const showCard = canEdit || hasNormalized || hasRaw;
  if (!showCard) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>KSM Teknik Verileri</CardTitle>
        <p className="text-sm text-muted-foreground">
          Normalize edilmiş teknik alanlar. Manuel giriş VIEW verisini override eder.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {KSM_NORMALIZED_GROUPS.map(({ label, keys }) => (
          <div key={label}>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">{label}</h4>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {keys.map((key) =>
                canEdit ? (
                  <div key={key}>
                    <Label htmlFor={key} className="text-xs">
                      {labelForKey(key)}
                    </Label>
                    <Input
                      id={key}
                      value={formData[key] ?? ''}
                      onChange={(e) => handleChange(key, e.target.value)}
                      className="mt-1"
                      placeholder="-"
                    />
                  </div>
                ) : (
                  <div key={key}>
                    <p className="text-xs text-muted-foreground">{labelForKey(key)}</p>
                    <p className="font-medium mt-0.5">
                      {(initialNormalized?.[key as keyof KsmNormalizedFields] != null
                        ? String(initialNormalized[key as keyof KsmNormalizedFields])
                        : formData[key]) || '-'}
                    </p>
                  </div>
                )
              )}
            </div>
          </div>
        ))}

        {canEdit && (
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {saving ? ' Kaydediliyor...' : ' Kaydet'}
          </Button>
        )}

        {raw && Object.keys(raw).length > 0 && (
          <div className="border rounded-lg">
            <button
              type="button"
              onClick={() => setRawOpen((o) => !o)}
              className="flex items-center gap-2 w-full px-4 py-2 text-left text-sm font-medium text-muted-foreground hover:bg-muted/50"
            >
              {rawOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              Ham veri (raw) – sadece okunur
            </button>
            {rawOpen && (
              <div className="p-4 pt-0 border-t bg-muted/30">
                <pre className="text-xs overflow-auto max-h-64 whitespace-pre-wrap break-all">
                  {JSON.stringify(raw, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
