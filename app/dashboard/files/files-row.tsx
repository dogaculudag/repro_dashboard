'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { STATUS_LABELS, STATUS_COLORS, PRIORITY_LABELS, formatDisplayDateOnly } from '@/lib/utils';
import { DueBadge } from '@/components/files/due-badge';
import { ArrowRight, Check, X } from 'lucide-react';

type FileRow = {
  id: string;
  fileNo: string;
  customerName: string;
  status: string;
  stage?: string | null;
  priority: string;
  difficultyLevel: number;
  difficultyWeight: number;
  assignedDesigner: { id: string; fullName: string } | null;
  targetAssignee?: { id: string; fullName: string } | null;
  currentDepartment: { id: string; name: string; code: string };
  fileType: { id: string; name: string } | null;
  dueDate?: Date | string | null;
};

type FileTypeOption = { id: string; name: string };
type DesignerOption = { id: string; fullName: string };

export function FilesRow({
  file,
  isAdmin,
  fileTypes,
  designers,
}: {
  file: FileRow;
  isAdmin: boolean;
  fileTypes: FileTypeOption[];
  designers: DesignerOption[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    fileTypeId: file.fileType?.id ?? '',
    assignedUserId: file.assignedDesigner?.id ?? '',
    difficultyLevel: String(file.difficultyLevel),
    difficultyWeight: String(file.difficultyWeight),
  });

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/files/${file.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileTypeId: form.fileTypeId || null,
          assignedUserId: form.assignedUserId || null,
          difficultyLevel: form.difficultyLevel ? parseInt(form.difficultyLevel, 10) : undefined,
          difficultyWeight: form.difficultyWeight ? parseFloat(form.difficultyWeight) : undefined,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message);
      setEditing(false);
      router.refresh();
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setForm({
      fileTypeId: file.fileType?.id ?? '',
      assignedUserId: file.assignedDesigner?.id ?? '',
      difficultyLevel: String(file.difficultyLevel),
      difficultyWeight: String(file.difficultyWeight),
    });
    setEditing(false);
  };

  return (
    <div className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/dashboard/files/${file.id}`} className="font-semibold hover:underline">
              {file.fileNo}
            </Link>
            <Badge className={STATUS_COLORS[file.status as keyof typeof STATUS_COLORS]}>
              {STATUS_LABELS[file.status as keyof typeof STATUS_LABELS]}
            </Badge>
            {file.stage === 'PRE_REPRO' && !file.assignedDesigner && (
              <Badge variant="secondary" className="whitespace-nowrap">
                Ön Repro Kuyruğunda {file.targetAssignee?.fullName ? `(Hedef: ${file.targetAssignee.fullName})` : ''}
              </Badge>
            )}
            {file.stage === 'PRE_REPRO' && file.assignedDesigner && (
              <Badge variant="outline" className="whitespace-nowrap">
                Ön Repro&apos;da (Sahip: {file.assignedDesigner.fullName})
              </Badge>
            )}
            {file.priority !== 'NORMAL' && (
              <Badge variant={file.priority === 'URGENT' ? 'destructive' : 'secondary'}>
                {PRIORITY_LABELS[file.priority as keyof typeof PRIORITY_LABELS]}
              </Badge>
            )}
            {isAdmin && (
              <>
                <span className="text-xs text-muted-foreground">
                  Tip: {file.fileType?.name ?? '—'}
                </span>
                <span className="text-xs text-muted-foreground">
                  Zorluk: {file.difficultyLevel} / Ağırlık: {file.difficultyWeight}
                </span>
              </>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{file.customerName}</p>
        </div>
        <div className="text-right flex items-center gap-4">
          <div>
            <p className="text-sm">{file.currentDepartment.name}</p>
            {file.stage === 'PRE_REPRO' && file.targetAssignee && (
              <p className="text-xs text-muted-foreground">Hedef: {file.targetAssignee.fullName}</p>
            )}
            {file.stage !== 'PRE_REPRO' && file.assignedDesigner && (
              <p className="text-xs text-muted-foreground">{file.assignedDesigner.fullName}</p>
            )}
            {file.stage === 'PRE_REPRO' && file.assignedDesigner && (
              <p className="text-xs text-muted-foreground">Sahip: {file.assignedDesigner.fullName}</p>
            )}
            <div className="mt-1 flex flex-col items-end gap-0.5">
              <span className="text-xs text-muted-foreground">
                Termin: {file.dueDate ? formatDisplayDateOnly(file.dueDate) : '—'}
              </span>
              <DueBadge dueDate={file.dueDate} />
            </div>
          </div>
          {isAdmin && !editing && (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              Düzenle
            </Button>
          )}
          {isAdmin && editing && (
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={loading}>
                <Check className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancel} disabled={loading}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
          <Link href={`/dashboard/files/${file.id}`}>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        </div>
      </div>
      {isAdmin && editing && (
        <div className="mt-4 pt-4 border-t grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="text-xs text-muted-foreground">Dosya tipi</label>
            <select
              value={form.fileTypeId}
              onChange={(e) => setForm((f) => ({ ...f, fileTypeId: e.target.value }))}
              className="w-full border rounded px-2 py-1.5 text-sm mt-0.5"
            >
              <option value="">—</option>
              {fileTypes.map((ft) => (
                <option key={ft.id} value={ft.id}>{ft.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Sorumlu</label>
            <select
              value={form.assignedUserId}
              onChange={(e) => setForm((f) => ({ ...f, assignedUserId: e.target.value }))}
              className="w-full border rounded px-2 py-1.5 text-sm mt-0.5"
            >
              <option value="">—</option>
              {designers.map((u) => (
                <option key={u.id} value={u.id}>{u.fullName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Zorluk (1-5)</label>
            <select
              value={form.difficultyLevel}
              onChange={(e) => setForm((f) => ({ ...f, difficultyLevel: e.target.value }))}
              className="w-full border rounded px-2 py-1.5 text-sm mt-0.5"
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Ağırlık</label>
            <Input
              type="number"
              step={0.1}
              min={0}
              value={form.difficultyWeight}
              onChange={(e) => setForm((f) => ({ ...f, difficultyWeight: e.target.value }))}
              className="mt-0.5 h-8"
            />
          </div>
        </div>
      )}
    </div>
  );
}
