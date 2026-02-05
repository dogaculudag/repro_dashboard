'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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

type CustomerOption = { customerName: string; customerNo?: string };

export default function NewFilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);
  const [designers, setDesigners] = useState<{ id: string; fullName: string; username: string }[]>([]);
  const [nextFileNo, setNextFileNo] = useState<string>('');
  const [customerSuggestions, setCustomerSuggestions] = useState<CustomerOption[]>([]);
  const [customerSuggestionsOpen, setCustomerSuggestionsOpen] = useState(false);
  const customerInputRef = useRef<HTMLInputElement>(null);
  const customerListRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    // Optional override: can be filled by external system integration
    fileNo: '',
    customerName: '',
    customerNo: '',
    sapNumber: '',
    orderName: '',
    designNo: '',
    revisionNo: '',
    targetAssigneeId: '',
    locationSlotId: '',
    priority: 'NORMAL',
    requiresApproval: true,
    dueDate: '',
    ksmWidth: '',
    ksmHeight: '',
    ksmCylinder: '',
    ksmColors: '',
    ksmNotes: '',
  });

  useEffect(() => {
    Promise.all([
      fetch('/api/locations?area=WAITING').then((res) => res.json()),
      fetch('/api/files/next-file-no').then((res) => res.json()),
      fetch('/api/users/designers').then((res) => res.json()),
    ])
      .then(([locData, fileNoData, designersData]) => {
        if (locData.success) setLocations(locData.data);
        if (fileNoData.success) setNextFileNo(fileNoData.data.fileNo);
        if (designersData.success) setDesigners(designersData.data ?? []);
      })
      .catch(console.error);
  }, []);

  const fetchCustomers = useCallback(async (q: string) => {
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    const res = await fetch(`/api/files/customers?${params}`);
    const data = await res.json();
    if (data.success) setCustomerSuggestions(data.data);
    else setCustomerSuggestions([]);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      fetchCustomers(formData.customerName);
    }, 200);
    return () => clearTimeout(t);
  }, [formData.customerName, fetchCustomers]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        customerListRef.current &&
        !customerListRef.current.contains(e.target as Node) &&
        customerInputRef.current &&
        !customerInputRef.current.contains(e.target as Node)
      ) {
        setCustomerSuggestionsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const ksmData: Record<string, any> = {};
      if (formData.ksmWidth) ksmData.width = Number(formData.ksmWidth);
      if (formData.ksmHeight) ksmData.height = Number(formData.ksmHeight);
      if (formData.ksmCylinder) ksmData.cylinder = formData.ksmCylinder;
      if (formData.ksmColors) ksmData.colors = formData.ksmColors.split(',').map((c) => c.trim());
      if (formData.ksmNotes) ksmData.notes = formData.ksmNotes;

      const body: Record<string, unknown> = {
        // If provided, backend will use it; otherwise it auto-generates.
        fileNo: formData.fileNo || undefined,
        customerName: formData.customerName.trim(),
        customerNo: formData.customerNo || null,
        sapNumber: formData.sapNumber || null,
        orderName: formData.orderName || null,
        designNo: formData.designNo || null,
        revisionNo: formData.revisionNo || null,
        targetAssigneeId: formData.targetAssigneeId || undefined,
        locationSlotId: formData.locationSlotId,
        priority: formData.priority,
        requiresApproval: formData.requiresApproval,
        ksmData: Object.keys(ksmData).length > 0 ? ksmData : null,
      };
      if (formData.dueDate) body.dueDate = formData.dueDate;

      const response = await fetch('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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

  const selectCustomer = (c: CustomerOption) => {
    setFormData((prev) => ({
      ...prev,
      customerName: c.customerName,
      customerNo: c.customerNo ?? prev.customerNo,
    }));
    setCustomerSuggestionsOpen(false);
  };

  return (
    <div className="space-y-6 max-w-3xl">
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
                <Label htmlFor="sapNumber">SAP Numarası</Label>
                <Input
                  id="sapNumber"
                  placeholder="SAP no"
                  value={formData.sapNumber}
                  onChange={(e) => setFormData({ ...formData, sapNumber: e.target.value })}
                />
              </div>
              <div className="space-y-2 relative">
                <Label htmlFor="customerName">Müşteri *</Label>
                <Input
                  ref={customerInputRef}
                  id="customerName"
                  placeholder="Ara veya seçin..."
                  value={formData.customerName}
                  onChange={(e) => {
                    setFormData({ ...formData, customerName: e.target.value });
                    setCustomerSuggestionsOpen(true);
                  }}
                  onFocus={() => setCustomerSuggestionsOpen(true)}
                  required
                />
                {customerSuggestionsOpen && customerSuggestions.length > 0 && (
                  <div
                    ref={customerListRef}
                    className="absolute z-10 mt-1 w-full rounded-md border bg-background shadow-lg max-h-48 overflow-auto"
                  >
                    {customerSuggestions.map((c) => (
                      <button
                        key={c.customerName}
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                        onClick={() => selectCustomer(c)}
                      >
                        {c.customerName}
                        {c.customerNo ? ` (${c.customerNo})` : ''}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="orderName">Sipariş Adı</Label>
                <Input
                  id="orderName"
                  placeholder="Sipariş adı"
                  value={formData.orderName}
                  onChange={(e) => setFormData({ ...formData, orderName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="designNo">Tasarım No</Label>
                <Input
                  id="designNo"
                  placeholder="Tasarım no"
                  value={formData.designNo}
                  onChange={(e) => setFormData({ ...formData, designNo: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="revisionNo">Revizyon No</Label>
                <Input
                  id="revisionNo"
                  placeholder="Revizyon no"
                  value={formData.revisionNo}
                  onChange={(e) => setFormData({ ...formData, revisionNo: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fileNo">Dosya No *</Label>
                <Input
                  id="fileNo"
                  value={formData.fileNo || nextFileNo}
                  onChange={(e) => setFormData({ ...formData, fileNo: e.target.value })}
                  placeholder={nextFileNo || 'REP-YYYY-NNNN'}
                />
                <p className="text-xs text-muted-foreground">
                  Boş bırakırsanız sistem otomatik üretir. Harici bir kaynaktan gelen değer varsa buraya girilebilir.
                </p>
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

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="dueDate">Termin Tarihi</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="targetAssigneeId">Hedef Kişi *</Label>
                <Select
                  value={formData.targetAssigneeId}
                  onValueChange={(value) => setFormData({ ...formData, targetAssigneeId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Hedef kişi seçin..." />
                  </SelectTrigger>
                  <SelectContent>
                    {designers.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.fullName} ({d.username})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Dosya Ön Repro kuyruğuna düşer; devredildiğinde bu kişiye atanır.
                </p>
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
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="requiresApproval"
                title="Müşteri onayı gerekli"
                aria-label="Müşteri onayı gerekli"
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
          <Button
            type="submit"
            disabled={loading || !formData.targetAssigneeId || !formData.locationSlotId}
          >
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
