'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function NewFilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    fileNo: '',
    customerName: '',
    customerNo: '',
    locationSlotId: '',
    priority: 'NORMAL',
    requiresApproval: true,
    ksmWidth: '',
    ksmHeight: '',
    ksmCylinder: '',
    ksmColors: '',
    ksmNotes: '',
  });

  useEffect(() => {
    fetch('/api/locations?area=WAITING')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setLocations(data.data);
        }
      })
      .catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const ksmData: Record<string, any> = {};
      if (formData.ksmWidth) ksmData.width = Number(formData.ksmWidth);
      if (formData.ksmHeight) ksmData.height = Number(formData.ksmHeight);
      if (formData.ksmCylinder) ksmData.cylinder = formData.ksmCylinder;
      if (formData.ksmColors) ksmData.colors = formData.ksmColors.split(',').map(c => c.trim());
      if (formData.ksmNotes) ksmData.notes = formData.ksmNotes;

      const response = await fetch('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileNo: formData.fileNo,
          customerName: formData.customerName,
          customerNo: formData.customerNo || null,
          locationSlotId: formData.locationSlotId,
          priority: formData.priority,
          requiresApproval: formData.requiresApproval,
          ksmData: Object.keys(ksmData).length > 0 ? ksmData : null,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'Dosya oluşturulamadı');
      }

      toast({
        title: 'Başarılı',
        description: 'Dosya başarıyla oluşturuldu',
      });

      router.push(`/dashboard/files/${data.data.id}`);
    } catch (error: any) {
      toast({
        title: 'Hata',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/files" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold">Yeni Dosya Oluştur</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Dosya Bilgileri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fileNo">Dosya No *</Label>
                <Input
                  id="fileNo"
                  placeholder="REP-2026-0001"
                  value={formData.fileNo}
                  onChange={(e) => setFormData({ ...formData, fileNo: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerName">Müşteri Adı *</Label>
                <Input
                  id="customerName"
                  placeholder="ABC Ambalaj A.Ş."
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="customerNo">Müşteri No</Label>
                <Input
                  id="customerNo"
                  placeholder="CUST-001"
                  value={formData.customerNo}
                  onChange={(e) => setFormData({ ...formData, customerNo: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Öncelik</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value })}
                >
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="locationSlotId">Fiziksel Konum *</Label>
              <Select
                value={formData.locationSlotId}
                onValueChange={(value) => setFormData({ ...formData, locationSlotId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Konum seçin..." />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem
                      key={loc.id}
                      value={loc.id}
                      disabled={!!loc.currentFile}
                    >
                      {loc.code} - {loc.name}
                      {loc.currentFile && ' (dolu)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="requiresApproval"
                checked={formData.requiresApproval}
                onChange={(e) => setFormData({ ...formData, requiresApproval: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="requiresApproval">Müşteri onayı gerekli</Label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>KSM Teknik Verileri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="ksmWidth">Genişlik (mm)</Label>
                <Input
                  id="ksmWidth"
                  type="number"
                  placeholder="1200"
                  value={formData.ksmWidth}
                  onChange={(e) => setFormData({ ...formData, ksmWidth: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ksmHeight">Yükseklik (mm)</Label>
                <Input
                  id="ksmHeight"
                  type="number"
                  placeholder="800"
                  value={formData.ksmHeight}
                  onChange={(e) => setFormData({ ...formData, ksmHeight: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ksmCylinder">Silindir Kodu</Label>
                <Input
                  id="ksmCylinder"
                  placeholder="C-120"
                  value={formData.ksmCylinder}
                  onChange={(e) => setFormData({ ...formData, ksmCylinder: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ksmColors">Renkler (virgülle ayırın)</Label>
              <Input
                id="ksmColors"
                placeholder="Cyan, Magenta, Yellow, Black"
                value={formData.ksmColors}
                onChange={(e) => setFormData({ ...formData, ksmColors: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ksmNotes">Teknik Notlar</Label>
              <Textarea
                id="ksmNotes"
                placeholder="Ek bilgiler..."
                value={formData.ksmNotes}
                onChange={(e) => setFormData({ ...formData, ksmNotes: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Dosya Oluştur
          </Button>
          <Link href="/dashboard/files">
            <Button type="button" variant="outline">İptal</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
