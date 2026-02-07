'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { PRIORITY_LABELS, formatDisplayDateOnly } from '@/lib/utils';
import { Pencil, Loader2, X, Check } from 'lucide-react';

type FileForInfo = {
  id: string;
  fileNo: string;
  customerName: string;
  customerNo: string | null;
  sapNumber: string | null;
  orderName: string | null;
  designNo: string | null;
  revisionNo: string | null;
  dueDate: Date | null;
  priority: string;
  requiresApproval: boolean;
  currentLocationSlotId: string | null;
  currentLocationSlot?: { id: string; code: string; name: string } | null;
};

export function FileInfoCard({ file }: { file: FileForInfo }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [locations, setLocations] = useState<{ id: string; code: string; name: string; currentFile?: unknown }[]>([]);
  const [formData, setFormData] = useState({
    customerName: file.customerName,
    customerNo: file.customerNo ?? '',
    sapNumber: file.sapNumber ?? '',
    orderName: file.orderName ?? '',
    designNo: file.designNo ?? '',
    revisionNo: file.revisionNo ?? '',
    dueDate: file.dueDate ? new Date(file.dueDate).toISOString().slice(0, 10) : '',
    priority: file.priority,
    requiresApproval: file.requiresApproval,
    locationSlotId: file.currentLocationSlotId ?? '',
  });

  useEffect(() => {
    if (file.customerName !== formData.customerName) setFormData((prev) => ({ ...prev, customerName: file.customerName }));
    if ((file.customerNo ?? '') !== formData.customerNo) setFormData((prev) => ({ ...prev, customerNo: file.customerNo ?? '' }));
    if ((file.sapNumber ?? '') !== formData.sapNumber) setFormData((prev) => ({ ...prev, sapNumber: file.sapNumber ?? '' }));
    if ((file.orderName ?? '') !== formData.orderName) setFormData((prev) => ({ ...prev, orderName: file.orderName ?? '' }));
    if ((file.designNo ?? '') !== formData.designNo) setFormData((prev) => ({ ...prev, designNo: file.designNo ?? '' }));
    if ((file.revisionNo ?? '') !== formData.revisionNo) setFormData((prev) => ({ ...prev, revisionNo: file.revisionNo ?? '' }));
    const dueStr = file.dueDate ? formatDisplayDateOnly(file.dueDate) : '';
    const isoDue = dueStr ? `${dueStr.slice(6, 10)}-${dueStr.slice(3, 5)}-${dueStr.slice(0, 2)}` : '';
    if (isoDue !== formData.dueDate) setFormData((prev) => ({ ...prev, dueDate: isoDue }));
    if (file.priority !== formData.priority) setFormData((prev) => ({ ...prev, priority: file.priority }));
    if (file.requiresApproval !== formData.requiresApproval) setFormData((prev) => ({ ...prev, requiresApproval: file.requiresApproval }));
    if ((file.currentLocationSlotId ?? '') !== formData.locationSlotId) setFormData((prev) => ({ ...prev, locationSlotId: file.currentLocationSlotId ?? '' }));
  }, [file]);

  useEffect(() => {
    if (editing) {
      fetch('/api/locations?area=WAITING')
        .then((res) => res.json())
        .then((data) => {
          if (data.success) setLocations(data.data);
        })
        .catch(console.error);
    }
  }, [editing]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        customerName: formData.customerName.trim(),
        customerNo: formData.customerNo || null,
        sapNumber: formData.sapNumber || null,
        orderName: formData.orderName || null,
        designNo: formData.designNo || null,
        revisionNo: formData.revisionNo || null,
        priority: formData.priority,
        requiresApproval: formData.requiresApproval,
      };
      if (formData.dueDate) body.dueDate = formData.dueDate;
      if (formData.locationSlotId) body.locationSlotId = formData.locationSlotId;

      const res = await fetch(`/api/files/${file.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || 'Güncellenemedi');
      toast({ title: 'Kaydedildi', description: 'Dosya bilgileri güncellendi.' });
      setEditing(false);
      router.refresh();
    } catch (e: any) {
      toast({ title: 'Hata', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const displayDue = file.dueDate ? formatDisplayDateOnly(file.dueDate) : '—';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Dosya Bilgileri</CardTitle>
        {!editing ? (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4 mr-1" />
            Düzenle
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditing(false)} disabled={saving}>
              <X className="h-4 w-4 mr-1" />
              İptal
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
              Kaydet
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {!editing ? (
          <div className="grid gap-4 md:grid-cols-2 text-sm">
            <div>
              <p className="text-muted-foreground">SAP Numarası</p>
              <p className="font-medium">{file.sapNumber || '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Müşteri</p>
              <p className="font-medium">{file.customerName}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Sipariş Adı</p>
              <p className="font-medium">{file.orderName || '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Tasarım No</p>
              <p className="font-medium">{file.designNo || '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Revizyon No</p>
              <p className="font-medium">{file.revisionNo || '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Dosya No</p>
              <p className="font-medium">{file.fileNo}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Müşteri No</p>
              <p className="font-medium">{file.customerNo || '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Öncelik</p>
              <p className="font-medium">{PRIORITY_LABELS[file.priority] ?? file.priority}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Termin Tarihi</p>
              <p className="font-medium">{displayDue}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Müşteri onayı gerekli</p>
              <p className="font-medium">{file.requiresApproval ? 'Evet' : 'Hayır'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Fiziksel Konum</p>
              <p className="font-medium">{file.currentLocationSlot?.code ?? '—'}</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 space-y-4">
            <div className="space-y-2">
              <Label>SAP Numarası</Label>
              <Input
                value={formData.sapNumber}
                onChange={(e) => setFormData({ ...formData, sapNumber: e.target.value })}
                placeholder="SAP no"
              />
            </div>
            <div className="space-y-2">
              <Label>Müşteri *</Label>
              <Input
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                placeholder="Müşteri adı"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Sipariş Adı</Label>
              <Input
                value={formData.orderName}
                onChange={(e) => setFormData({ ...formData, orderName: e.target.value })}
                placeholder="Sipariş adı"
              />
            </div>
            <div className="space-y-2">
              <Label>Tasarım No</Label>
              <Input
                value={formData.designNo}
                onChange={(e) => setFormData({ ...formData, designNo: e.target.value })}
                placeholder="Tasarım no"
              />
            </div>
            <div className="space-y-2">
              <Label>Revizyon No</Label>
              <Input
                value={formData.revisionNo}
                onChange={(e) => setFormData({ ...formData, revisionNo: e.target.value })}
                placeholder="Revizyon no"
              />
            </div>
            <div className="space-y-2">
              <Label>Dosya No</Label>
              <Input value={file.fileNo} readOnly className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>Müşteri No</Label>
              <Input
                value={formData.customerNo}
                onChange={(e) => setFormData({ ...formData, customerNo: e.target.value })}
                placeholder="Müşteri no"
              />
            </div>
            <div className="space-y-2">
              <Label>Öncelik</Label>
              <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Düşük</SelectItem>
                  <SelectItem value="NORMAL">Normal</SelectItem>
                  <SelectItem value="HIGH">Yüksek</SelectItem>
                  <SelectItem value="URGENT">Acil</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Termin Tarihi</Label>
              <Input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Fiziksel Konum</Label>
              <Select value={formData.locationSlotId} onValueChange={(v) => setFormData({ ...formData, locationSlotId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Konum seçin..." />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id} disabled={!!loc.currentFile}>
                      {loc.code} - {loc.name}
                      {loc.currentFile ? ' (dolu)' : null}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 md:col-span-2">
              <input
                type="checkbox"
                id="requiresApproval-edit"
                title="Müşteri onayı gerekli"
                aria-label="Müşteri onayı gerekli"
                checked={formData.requiresApproval}
                onChange={(e) => setFormData({ ...formData, requiresApproval: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="requiresApproval-edit">Müşteri onayı gerekli</Label>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
