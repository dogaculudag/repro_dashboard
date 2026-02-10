import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getMyWorkQueue } from '@/lib/services/file.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  STATUS_LABELS,
  STATUS_COLORS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  formatDuration,
  calculateElapsedSeconds,
} from '@/lib/utils';
import { DueBadge } from '@/components/files/due-badge';
import Link from 'next/link';
import { Clock, ArrowRight, AlertCircle } from 'lucide-react';

export default async function QueuePage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  const { role, id: userId, departmentId } = session.user;

  const queue = await getMyWorkQueue(role, userId, departmentId);
  const activeFiles = queue.activeFiles;
  const pendingTakeover = queue.pendingTakeover;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dosyalarım</h1>
        <p className="text-gray-500">
          {activeFiles.length} üzerinde çalışılan, {pendingTakeover.length} devir bekleyen
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Üzerinde Çalıştıklarım</p>
                <p className="text-2xl font-bold">{activeFiles.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Devir Bekliyor</p>
                <p className="text-2xl font-bold text-orange-500">{pendingTakeover.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Files */}
      <Card>
        <CardHeader>
          <CardTitle>Üzerinde Çalıştıklarım</CardTitle>
        </CardHeader>
        <CardContent>
          {activeFiles.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Üzerinde çalıştığınız dosya yok
            </p>
          ) : (
            <div className="space-y-4">
              {activeFiles.map((file: any) => {
                const activeTimer = file.timers?.[0];
                const elapsed = activeTimer
                  ? calculateElapsedSeconds(activeTimer.startTime)
                  : 0;

                return (
                  <Link
                    key={file.id}
                    href={`/dashboard/files/${file.id}?from=${encodeURIComponent('/dashboard/queue')}`}
                    className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">{file.fileNo}</span>
                          <Badge className={STATUS_COLORS[file.status]}>
                            {STATUS_LABELS[file.status]}
                          </Badge>
                          {file.priority !== 'NORMAL' && (
                            <Badge className={PRIORITY_COLORS[file.priority]}>
                              {PRIORITY_LABELS[file.priority]}
                            </Badge>
                          )}
                          <DueBadge dueDate={file.dueDate} />
                        </div>
                        <p className="text-sm text-muted-foreground">{file.customerName}</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2 text-primary">
                          <Clock className="h-4 w-4" />
                          <span className="font-mono">{formatDuration(elapsed)}</span>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground mt-2 ml-auto" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Takeover */}
      <Card>
        <CardHeader>
          <CardTitle className="text-orange-600">Devir Bekliyor</CardTitle>
        </CardHeader>
        <CardContent>
          {pendingTakeover.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Devir bekleyen dosya yok
            </p>
          ) : (
            <div className="space-y-4">
              {pendingTakeover.map((file: any) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-4 border border-orange-200 bg-orange-50 rounded-lg"
                >
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{file.fileNo}</span>
                      <Badge className={STATUS_COLORS[file.status]}>
                        {STATUS_LABELS[file.status]}
                      </Badge>
                      <DueBadge dueDate={file.dueDate} />
                    </div>
                    <p className="text-sm text-muted-foreground">{file.customerName}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/dashboard/files/${file.id}?from=${encodeURIComponent('/dashboard/queue')}`}>
                      <Button size="sm" variant="outline">
                        Detay
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
