import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getPreReproQueue } from '@/lib/services/file.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileActionButtons } from '@/components/files/file-action-buttons';
import Link from 'next/link';
import { formatDisplayDate } from '@/lib/utils';

/** Pre-repro queue row shape (getPreReproQueue includes these relations at runtime) */
type PreReproRow = Awaited<ReturnType<typeof getPreReproQueue>>[number] & {
  targetAssignee?: { fullName: string } | null;
  assignedDesigner?: { fullName: string } | null;
  currentLocationSlot?: { code: string; name: string } | null;
  targetAssigneeId?: string | null;
};

export default async function PreReproQueuePage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  const { role } = session.user;
  if (role !== 'ONREPRO' && role !== 'ADMIN') {
    redirect('/dashboard');
  }

  const files = (await getPreReproQueue()) as PreReproRow[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Ön Repro Kuyruğu</h1>
        <p className="text-gray-500">
          Önce <strong>Devral</strong> ile dosyayı alın, sonra <strong>Devret</strong> ile hedef kişiye atayın; dosya o kişinin &quot;Dosyalarım&quot; listesine düşer. Hedef kişi dosya oluşturulurken atanır.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ön Repro&apos;da Bekleyen Dosyalar ({files.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {files.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Ön Repro kuyruğunda bekleyen dosya yok
            </p>
          ) : (
            <div className="space-y-4">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <Link
                      href={`/dashboard/files/${file.id}`}
                      className="font-semibold text-primary hover:underline"
                    >
                      {file.fileNo}
                    </Link>
                    <p className="text-sm text-muted-foreground">{file.customerName}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Hedef: {file.targetAssignee?.fullName ?? '—'} · Oluşturulma: {formatDisplayDate(file.createdAt)}
                    </p>
                    {file.currentLocationSlot && (
                      <p className="text-xs text-muted-foreground">
                        Konum: {file.currentLocationSlot.code} - {file.currentLocationSlot.name}
                      </p>
                    )}
                  </div>
                  <FileActionButtons
                    file={{
                      id: file.id,
                      assignedDesignerId: file.assignedDesignerId,
                      targetAssigneeId: file.targetAssigneeId ?? null,
                      assignedDesigner: file.assignedDesigner,
                      stage: file.stage != null ? String(file.stage) : undefined,
                    }}
                    currentUserId={session.user!.id}
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
