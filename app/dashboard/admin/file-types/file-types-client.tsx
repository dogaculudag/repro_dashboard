'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Pencil, Trash2 } from 'lucide-react';

type FileType = {
  id: string;
  name: string;
  description: string | null;
  defaultDifficultyLevel: number | null;
  defaultDifficultyWeight: number | null;
  createdAt: Date;
};

export function FileTypesClient({ initialFileTypes }: { initialFileTypes: FileType[] }) {
  const router = useRouter();
  const [fileTypes, setFileTypes] = useState(initialFileTypes);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    defaultDifficultyLevel: '' as string | number,
    defaultDifficultyWeight: '' as string | number,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setForm({
      name: '',
      description: '',
      defaultDifficultyLevel: '',
      defaultDifficultyWeight: '',
    });
    setCreating(false);
    setEditingId(null);
  };

  const loadEdit = (ft: FileType) => {
    setForm({
      name: ft.name,
      description: ft.description ?? '',
      defaultDifficultyLevel: ft.defaultDifficultyLevel ?? '',
      defaultDifficultyWeight: ft.defaultDifficultyWeight ?? '',
    });
    setEditingId(ft.id);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/admin/file-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          defaultDifficultyLevel: form.defaultDifficultyLevel === '' ? undefined : Number(form.defaultDifficultyLevel),
          defaultDifficultyWeight: form.defaultDifficultyWeight === '' ? undefined : Number(form.defaultDifficultyWeight),
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message ?? 'Hata');
      setFileTypes((prev) => [...prev, json.data]);
      resetForm();
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/file-types/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || null,
          defaultDifficultyLevel: form.defaultDifficultyLevel === '' ? null : Number(form.defaultDifficultyLevel),
          defaultDifficultyWeight: form.defaultDifficultyWeight === '' ? null : Number(form.defaultDifficultyWeight),
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message ?? 'Hata');
      setFileTypes((prev) => prev.map((ft) => (ft.id === editingId ? json.data : ft)));
      resetForm();
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}" tipini silmek istediğinize emin misiniz?`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/file-types/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message ?? 'Hata');
      setFileTypes((prev) => prev.filter((ft) => ft.id !== id));
      resetForm();
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {(creating || editingId) && (
        <Card>
          <CardContent className="pt-6">
            <form
              onSubmit={editingId ? handleUpdate : handleCreate}
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
              <div>
                <Label htmlFor="name">Ad *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Örn: Ambalaj"
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Açıklama</Label>
                <Input
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Opsiyonel"
                />
              </div>
              <div>
                <Label htmlFor="defaultDifficultyLevel">Varsayılan zorluk (1-5)</Label>
                <Input
                  id="defaultDifficultyLevel"
                  type="number"
                  min={1}
                  max={5}
                  value={form.defaultDifficultyLevel}
                  onChange={(e) => setForm((f) => ({ ...f, defaultDifficultyLevel: e.target.value }))}
                  placeholder="3"
                />
              </div>
              <div>
                <Label htmlFor="defaultDifficultyWeight">Varsayılan ağırlık</Label>
                <Input
                  id="defaultDifficultyWeight"
                  type="number"
                  step={0.1}
                  min={0}
                  value={form.defaultDifficultyWeight}
                  onChange={(e) => setForm((f) => ({ ...f, defaultDifficultyWeight: e.target.value }))}
                  placeholder="1.0"
                />
              </div>
              <div className="flex gap-2 sm:col-span-2 lg:col-span-4">
                <Button type="submit" disabled={loading}>
                  {editingId ? 'Güncelle' : 'Oluştur'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm} disabled={loading}>
                  İptal
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {!creating && !editingId && (
        <Button onClick={() => setCreating(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Yeni tip
        </Button>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Ad</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Açıklama</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Varsayılan zorluk</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Varsayılan ağırlık</th>
              <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {fileTypes.map((ft) => (
              <tr key={ft.id} className="border-t border-gray-200">
                <td className="px-4 py-2 text-sm text-gray-900">{ft.name}</td>
                <td className="px-4 py-2 text-sm text-gray-500">{ft.description ?? '—'}</td>
                <td className="px-4 py-2 text-sm">{ft.defaultDifficultyLevel ?? '—'}</td>
                <td className="px-4 py-2 text-sm">{ft.defaultDifficultyWeight ?? '—'}</td>
                <td className="px-4 py-2 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => loadEdit(ft)}
                    disabled={loading}
                    className="mr-1"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(ft.id, ft.name)}
                    disabled={loading || ft.name === 'GENEL'}
                    className="text-red-600 hover:text-red-700"
                    title={ft.name === 'GENEL' ? 'GENEL silinemez' : 'Sil'}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
