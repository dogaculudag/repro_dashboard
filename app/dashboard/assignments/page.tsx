'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { PRIORITY_LABELS, PRIORITY_COLORS, formatDisplayDate } from '@/lib/utils';
import {
  UserPlus,
  Loader2,
  FileText,
  CheckSquare,
  Square,
  User,
  ChevronRight,
} from 'lucide-react';

export default function AssignmentsPage() {
  const router = useRouter();
  const [files, setFiles] = useState<any[]>([]);
  const [designers, setDesigners] = useState<any[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [selectedDesigner, setSelectedDesigner] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [assigningFileId, setAssigningFileId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [filesRes, designersRes] = await Promise.all([
        fetch('/api/assignments/pool'),
        fetch('/api/users/designers'),
      ]);

      const filesData = await filesRes.json();
      const designersData = await designersRes.json();

      if (filesData.success) setFiles(filesData.data ?? []);
      if (designersData.success) setDesigners(designersData.data ?? []);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const toggleFileSelection = (e: React.MouseEvent, fileId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedFiles((prev) =>
      prev.includes(fileId)
        ? prev.filter((id) => id !== fileId)
        : [...prev, fileId]
    );
  };

  const selectAll = () => {
    if (selectedFiles.length === files.length) {
      setSelectedFiles([]);
    } else {
      setSelectedFiles(files.map((f) => f.id));
    }
  };

  const clearSelection = () => {
    setSelectedFiles([]);
  };

  const allSelected = files.length > 0 && selectedFiles.length === files.length;
  const someSelected = selectedFiles.length > 0;

  const handleQuickAssign = async (fileId: string, assigneeId: string) => {
    setAssigningFileId(fileId);
    try {
      const response = await fetch('/api/assignments/single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, assigneeId }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error?.message || 'Atama başarısız');
      const targetName = data.data?.targetAssignee?.fullName ?? designers.find((d) => d.id === assigneeId)?.fullName ?? 'Grafiker';
      toast({
        title: 'Ön Repro Kuyruğuna Gönderildi',
        description: `Dosya ön repro kuyruğuna gönderildi (Hedef: ${targetName}). Ön repro devretmeden grafiker listesine düşmez.`,
      });
      loadData();
      router.refresh();
    } catch (error: any) {
      toast({ title: 'Hata', description: error.message, variant: 'destructive' });
    } finally {
      setAssigningFileId(null);
    }
  };

  const handleBulkAssign = async () => {
    if (!selectedDesigner) {
      toast({ title: 'Hata', description: 'Lütfen bir tasarımcı seçin', variant: 'destructive' });
      return;
    }
    if (selectedFiles.length === 0) {
      toast({ title: 'Hata', description: 'En az bir dosya seçin', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/assignments/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileIds: selectedFiles,
          assigneeId: selectedDesigner,
          note: note.trim() || undefined,
        }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error?.message || 'Toplu atama başarısız');
      const { successCount, failCount, results } = data.data;
      const failed = results.filter((r: any) => !r.success);
      if (failCount > 0) {
        toast({
          title: 'Kısmen tamamlandı',
          description: `${successCount} atandı, ${failCount} hata. ${failed.map((f: any) => f.error).join('; ')}`,
          variant: 'destructive',
        });
      } else {
        const designerName = designers.find((d: any) => d.id === selectedDesigner)?.fullName ?? 'Grafiker';
        toast({
          title: 'Ön Repro Kuyruğuna Gönderildi',
          description: `${successCount} dosya ön repro kuyruğuna gönderildi (Hedef: ${designerName}). Ön repro devretmeden grafiker listesine düşmez.`,
        });
      }
      setSelectedFiles([]);
      setSelectedDesigner('');
      setNote('');
      setShowModal(false);
      loadData();
      router.refresh();
    } catch (error: any) {
      toast({ title: 'Hata', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Atama Havuzu</h1>
          <p className="text-gray-500">{files.length} dosya atama bekliyor</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {files.length > 0 && (
            <>
              <Button variant="outline" size="sm" onClick={selectAll}>
                {allSelected ? (
                  <><Square className="mr-2 h-4 w-4" />Seçimi Kaldır</>
                ) : (
                  <><CheckSquare className="mr-2 h-4 w-4" />Tümünü Seç ({files.length})</>
                )}
              </Button>
              {someSelected && (
                <>
                  <Button variant="outline" size="sm" onClick={clearSelection}>
                    Seçimi Temizle
                  </Button>
                  <Button onClick={() => setShowModal(true)}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Toplu Ata ({selectedFiles.length} dosya)
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Atama Bekleyen Dosyalar</span>
            {someSelected && <Badge variant="secondary">{selectedFiles.length} seçili</Badge>}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Grafiker seçtiğinizde dosya Ön Repro Kuyruğuna gönderilir (hedef grafiker kaydedilir). Ön repro kullanıcısı dosyayı sahiplenip &quot;Devret&quot; dediğinde dosya o grafikerin listesine düşer.
          </p>
        </CardHeader>
        <CardContent>
          {files.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Atama bekleyen dosya yok</p>
            </div>
          ) : (
            <div className="space-y-2">
              {files.map((file) => (
                <div
                  key={file.id}
                  className={`flex items-center gap-3 p-4 border rounded-lg transition-colors ${
                    selectedFiles.includes(file.id)
                      ? 'bg-primary/10 border-primary ring-1 ring-primary/20'
                      : 'hover:bg-gray-50 border-transparent'
                  }`}
                >
                  {/* Çekmece: seçim kutusu */}
                  <div
                    onClick={(e) => toggleFileSelection(e, file.id)}
                    className="flex-shrink-0 cursor-pointer p-1"
                    title="Toplu atama için seç"
                  >
                    {selectedFiles.includes(file.id) ? (
                      <CheckSquare className="h-5 w-5 text-primary" />
                    ) : (
                      <Square className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>

                  {/* Dosya bilgisi: tıklanınca detay sayfasına git */}
                  <Link
                    href={`/dashboard/files/${file.id}`}
                    className="flex-1 min-w-0 flex items-center gap-4 group cursor-pointer"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold group-hover:text-primary">{file.fileNo}</span>
                        <Badge className={PRIORITY_COLORS[file.priority]}>
                          {PRIORITY_LABELS[file.priority]}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{file.customerName}</p>
                    </div>
                    <div className="text-sm text-muted-foreground flex-shrink-0">
                      {formatDisplayDate(file.createdAt)}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary flex-shrink-0" />
                  </Link>

                  {/* Hızlı atama: grafiker çekmece kutusu */}
                  <div
                    className="flex-shrink-0 w-[220px]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Select
                      value=""
                      onValueChange={(designerId) => handleQuickAssign(file.id, designerId)}
                      disabled={assigningFileId === file.id}
                    >
                      <SelectTrigger
                        className="h-9 bg-muted/50"
                        title="Hedef grafiker seç – dosya ön repro kuyruğuna gider"
                      >
                        {assigningFileId === file.id ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Kuyruğa gönderiliyor...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2 text-muted-foreground">
                            <User className="h-4 w-4" />
                            Hedef grafiker seç
                          </span>
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        {designers.map((designer) => (
                          <SelectItem key={designer.id} value={designer.id}>
                            {designer.fullName} ({designer.activeFilesCount} aktif)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Toplu atama modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>Ön Repro Kuyruğuna Gönder</CardTitle>
              <p className="text-sm text-muted-foreground">
                {selectedFiles.length} dosyayı seçtiğiniz hedef grafiker için ön repro kuyruğuna göndereceksiniz. Ön repro devretmeden dosyalar grafiker listesine düşmez.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-h-32 overflow-y-auto rounded border bg-muted/30 p-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">Seçili dosyalar:</p>
                <ul className="space-y-1 text-sm">
                  {selectedFiles.map((id) => {
                    const file = files.find((f) => f.id === id);
                    return (
                      <li key={id} className="flex justify-between gap-2">
                        <span className="truncate">{file?.fileNo}</span>
                        <span className="text-muted-foreground truncate">{file?.customerName}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Hedef grafiker seç *</label>
                <Select value={selectedDesigner} onValueChange={setSelectedDesigner}>
                  <SelectTrigger>
                    <SelectValue placeholder="Hedef grafiker seçin (ön repro kuyruğuna gidecek)..." />
                  </SelectTrigger>
                  <SelectContent>
                    {designers.map((designer) => (
                      <SelectItem key={designer.id} value={designer.id}>
                        {designer.fullName} — {designer.activeFilesCount} aktif iş
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Not (opsiyonel)</label>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Tüm atamalara eklenecek not..."
                  rows={2}
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" onClick={() => setShowModal(false)} disabled={loading}>
                  İptal
                </Button>
                <Button onClick={handleBulkAssign} disabled={loading}>
                  {loading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Kuyruğa gönderiliyor...</>
                  ) : (
                    <><UserPlus className="mr-2 h-4 w-4" />{selectedFiles.length} Dosyayı Kuyruğa Gönder</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
