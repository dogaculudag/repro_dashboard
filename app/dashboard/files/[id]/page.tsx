import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { getFileById } from '@/lib/services/file.service';
import { getFileTimers } from '@/lib/services/timer.service';
import { getFileNotes } from '@/lib/services/note.service';
import { getFileAuditLogs } from '@/lib/services/audit.service';
import { getAvailableActions } from '@/lib/rbac';
import { userHasActiveTimer } from '@/lib/services/timer.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  STATUS_LABELS,
  STATUS_COLORS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  ACTION_LABELS,
  formatDisplayDate,
  formatDuration,
  formatDurationFromMinutes,
  calculateElapsedSeconds,
} from '@/lib/utils';
import { FileActions } from '@/components/files/file-actions';
import { FileActionButtons } from '@/components/files/file-action-buttons';
import { FileTimer } from '@/components/files/file-timer';
import { FileInfoCard } from '@/components/files/file-info-card';
import { KsmTechnicalDataForm } from '@/components/files/ksm-technical-data-form';
import { ArrowLeft, MapPin, User, Clock, Building2, Users } from 'lucide-react';
import Link from 'next/link';

interface PageProps {
  params: { id: string };
}

export default async function FileDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  const [file, timers, notes, logs] = await Promise.all([
    getFileById(params.id),
    getFileTimers(params.id),
    getFileNotes(params.id),
    getFileAuditLogs(params.id),
  ]);

  if (!file) {
    notFound();
  }

  const hasTimer = await userHasActiveTimer(params.id, session.user.id);
  const availableActions = getAvailableActions(session.user, file, hasTimer);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/files" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{file.fileNo}</h1>
            <Badge className={STATUS_COLORS[file.status]}>
              {STATUS_LABELS[file.status]}
            </Badge>
            {file.priority !== 'NORMAL' && (
              <Badge className={PRIORITY_COLORS[file.priority]}>
                {PRIORITY_LABELS[file.priority]}
              </Badge>
            )}
            {file.iterationNumber > 1 && (
              <Badge variant="outline">{file.iterationLabel}</Badge>
            )}
          </div>
          <p className="text-muted-foreground">{file.customerName}</p>
        </div>
        <FileActionButtons
          file={{
            id: file.id,
            assignedDesignerId: file.assignedDesignerId,
            targetAssigneeId: file.targetAssigneeId ?? null,
            assignedDesigner: file.assignedDesigner,
            stage: file.stage,
          }}
          currentUserId={session.user.id}
          size="default"
        />
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Departman</p>
                <p className="font-medium">{file.currentDepartment.name}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Sorumlu</p>
                <p className="font-medium">
                  {file.assignedDesigner?.fullName || 'Atanmadı'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Konum</p>
                <p className="font-medium">
                  {file.currentLocationSlot?.code || 'Belirsiz'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Aktif Süre</p>
                <p className="font-medium">
                  {file.activeTimer
                    ? formatDuration(calculateElapsedSeconds(file.activeTimer.startTime))
                    : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dosya Bilgileri */}
      <FileInfoCard
        file={{
          id: file.id,
          fileNo: file.fileNo,
          customerName: file.customerName,
          customerNo: file.customerNo,
          sapNumber: file.sapNumber ?? null,
          orderName: file.orderName ?? null,
          designNo: file.designNo ?? null,
          revisionNo: file.revisionNo ?? null,
          dueDate: file.dueDate ?? null,
          priority: file.priority,
          requiresApproval: file.requiresApproval,
          currentLocationSlotId: file.currentLocationSlotId,
          currentLocationSlot: file.currentLocationSlot,
        }}
      />

      {/* Süre takibi (TimeEntry) */}
      <Card>
        <CardHeader>
          <CardTitle>Süre takibi</CardTitle>
          <p className="text-sm text-muted-foreground">
            Bu dosyada çalışma sürenizi kaydetmek için timer başlatın/durdurun (performans analitiğinde kullanılır).
          </p>
        </CardHeader>
        <CardContent>
          <FileTimer fileId={file.id} />
        </CardContent>
      </Card>

      {/* Actions */}
      {availableActions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>İşlemler</CardTitle>
          </CardHeader>
          <CardContent>
            <FileActions fileId={file.id} availableActions={availableActions} />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Zaman Çizelgesi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log.id} className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <p className="font-medium">{ACTION_LABELS[log.actionType]}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDisplayDate(log.timestamp)}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {log.byUser.fullName}
                      {log.toDepartment && ` → ${log.toDepartment.name}`}
                    </p>
                  </div>
                </div>
              ))}
              {logs.length === 0 && (
                <p className="text-muted-foreground text-center py-4">Henüz kayıt yok</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Notlar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {notes.map((note) => (
                <div key={note.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between mb-1">
                    <p className="text-sm font-medium">{note.user.fullName}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDisplayDate(note.createdAt)}
                    </p>
                  </div>
                  <p className="text-sm">{note.message}</p>
                </div>
              ))}
              {notes.length === 0 && (
                <p className="text-muted-foreground text-center py-4">Henüz not yok</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* KSM Data */}
      {file.ksmData && Object.keys(file.ksmData).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>KSM Verileri</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {Object.entries(file.ksmData as Record<string, any>).map(([key, value]) => (
                <div key={key}>
                  <p className="text-sm text-muted-foreground capitalize">{key}</p>
                  <p className="font-medium">
                    {Array.isArray(value) ? value.join(', ') : String(value)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* KSM Teknik Verileri (raw + normalized, form sadece ADMIN) */}
      <KsmTechnicalDataForm
        fileId={file.id}
        initialNormalized={(file.ksmTechnicalData as { normalized?: Record<string, unknown> } | null)?.normalized ?? null}
        raw={(file.ksmTechnicalData as { raw?: Record<string, unknown> } | null)?.raw ?? null}
        canEdit={session.user.role === 'ADMIN'}
      />

      {/* Bu dosyada kim ne kadar çalıştı (çalışan bazlı) */}
      {file.workerBreakdown && file.workerBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Bu dosyada çalışan süreleri
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Çalışan bazlı toplam süre (work session)
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Çalışan</th>
                    <th className="text-left py-2">Oturum sayısı</th>
                    <th className="text-right py-2">Toplam süre</th>
                  </tr>
                </thead>
                <tbody>
                  {file.workerBreakdown.map((entry: { fullName: string; username: string; totalMinutes: number; sessions: number }) => (
                    <tr key={entry.username} className="border-b">
                      <td className="py-2 font-medium">{entry.fullName}</td>
                      <td className="py-2">{entry.sessions}</td>
                      <td className="py-2 text-right">
                        {formatDurationFromMinutes(entry.totalMinutes)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timer History */}
      <Card>
        <CardHeader>
          <CardTitle>Süre Geçmişi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Departman</th>
                  <th className="text-left py-2">Kullanıcı</th>
                  <th className="text-left py-2">Başlangıç</th>
                  <th className="text-left py-2">Bitiş</th>
                  <th className="text-right py-2">Süre</th>
                </tr>
              </thead>
              <tbody>
                {timers.map((timer) => (
                  <tr key={timer.id} className="border-b">
                    <td className="py-2">{timer.department.name}</td>
                    <td className="py-2">{timer.user?.fullName || '-'}</td>
                    <td className="py-2">{formatDisplayDate(timer.startTime)}</td>
                    <td className="py-2">
                      {timer.endTime ? formatDisplayDate(timer.endTime) : (
                        <Badge variant="success">Aktif</Badge>
                      )}
                    </td>
                    <td className="py-2 text-right">
                      {timer.durationSeconds
                        ? formatDuration(timer.durationSeconds)
                        : formatDuration(calculateElapsedSeconds(timer.startTime))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {timers.length === 0 && (
              <p className="text-muted-foreground text-center py-4">Henüz süre kaydı yok</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
