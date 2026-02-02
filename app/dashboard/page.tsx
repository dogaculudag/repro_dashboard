import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { FileStatus } from '@prisma/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDisplayDate, STATUS_LABELS, PRIORITY_COLORS } from '@/lib/utils';
import Link from 'next/link';
import {
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';

async function getDashboardData(role: string, userId: string, departmentId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (role === 'ADMIN') {
    const [
      unassignedCount,
      activeFilesCount,
      completedToday,
      overdueFiles,
      recentFiles,
    ] = await Promise.all([
      prisma.file.count({
        where: { status: FileStatus.AWAITING_ASSIGNMENT },
      }),
      prisma.file.count({
        where: { status: { notIn: [FileStatus.SENT_TO_PRODUCTION, FileStatus.AWAITING_ASSIGNMENT] } },
      }),
      prisma.file.count({
        where: {
          status: FileStatus.SENT_TO_PRODUCTION,
          closedAt: { gte: today },
        },
      }),
      prisma.file.findMany({
        where: {
          status: { notIn: [FileStatus.SENT_TO_PRODUCTION] },
          timers: {
            some: {
              endTime: null,
              startTime: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            },
          },
        },
        include: {
          currentDepartment: { select: { name: true, code: true } },
          assignedDesigner: { select: { fullName: true } },
        },
        take: 5,
      }),
      prisma.file.findMany({
        where: { status: { notIn: [FileStatus.SENT_TO_PRODUCTION] } },
        include: {
          currentDepartment: { select: { name: true, code: true } },
          assignedDesigner: { select: { fullName: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      }),
    ]);

    return {
      stats: { unassignedCount, activeFilesCount, completedToday, overdueCount: overdueFiles.length },
      overdueFiles,
      recentFiles,
    };
  }

  // For other roles, show their specific queue
  const [myActiveFiles, pendingTakeover] = await Promise.all([
    prisma.file.count({
      where: {
        currentDepartmentId: departmentId,
        pendingTakeover: false,
        status: { notIn: [FileStatus.SENT_TO_PRODUCTION] },
        ...(role === 'GRAFIKER' && { assignedDesignerId: userId }),
      },
    }),
    prisma.file.count({
      where: {
        currentDepartmentId: departmentId,
        pendingTakeover: true,
        ...(role === 'GRAFIKER' && { assignedDesignerId: userId }),
      },
    }),
  ]);

  const recentFiles = await prisma.file.findMany({
    where: {
      currentDepartmentId: departmentId,
      ...(role === 'GRAFIKER' && { assignedDesignerId: userId }),
    },
    include: {
      currentDepartment: { select: { name: true, code: true } },
      assignedDesigner: { select: { fullName: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 5,
  });

  return {
    stats: { myActiveFiles, pendingTakeover },
    recentFiles,
  };
}

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const { role, id: userId, departmentId, fullName } = session.user;
  const data = await getDashboardData(role, userId, departmentId);

  const isAdmin = role === 'ADMIN';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Hoş Geldiniz, {fullName}
        </h1>
        <p className="text-gray-500">
          {formatDisplayDate(new Date())}
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isAdmin ? (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Atama Bekliyor</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.stats.unassignedCount}</div>
                <Link href="/dashboard/assignments" className="text-xs text-primary hover:underline">
                  Havuza git →
                </Link>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Aktif Dosyalar</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.stats.activeFilesCount}</div>
                <p className="text-xs text-muted-foreground">İşlemde olan</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Bugün Tamamlanan</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{data.stats.completedToday}</div>
                <p className="text-xs text-muted-foreground">Üretime gönderilen</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Geciken İşler</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{data.stats.overdueCount}</div>
                <p className="text-xs text-muted-foreground">SLA aşımı</p>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Üzerindeki İşler</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.stats.myActiveFiles}</div>
                <Link href="/dashboard/queue" className="text-xs text-primary hover:underline">
                  Dosyalarıma git →
                </Link>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Devir Bekleyen</CardTitle>
                <FileText className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-500">{data.stats.pendingTakeover}</div>
                <p className="text-xs text-muted-foreground">Devralınacak dosyalar</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Recent Files */}
      <Card>
        <CardHeader>
          <CardTitle>Son Dosyalar</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentFiles.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">Henüz dosya yok</p>
          ) : (
            <div className="space-y-4">
              {data.recentFiles.map((file: any) => (
                <Link
                  key={file.id}
                  href={`/dashboard/files/${file.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-medium">{file.fileNo}</p>
                      <p className="text-sm text-muted-foreground">{file.customerName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${PRIORITY_COLORS[file.priority]}`}>
                      {file.priority}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {STATUS_LABELS[file.status]}
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Overdue Files (Admin only) */}
      {isAdmin && data.overdueFiles && data.overdueFiles.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Geciken Dosyalar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.overdueFiles.map((file: any) => (
                <Link
                  key={file.id}
                  href={`/dashboard/files/${file.id}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-red-50 hover:bg-red-100 transition-colors"
                >
                  <div>
                    <p className="font-medium">{file.fileNo}</p>
                    <p className="text-sm text-muted-foreground">{file.customerName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-red-600">
                      {file.currentDepartment.name}
                    </p>
                    {file.assignedDesigner && (
                      <p className="text-xs text-muted-foreground">
                        {file.assignedDesigner.fullName}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
