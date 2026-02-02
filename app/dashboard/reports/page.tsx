import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { FileStatus } from '@prisma/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDisplayDateOnly, formatDuration } from '@/lib/utils';
import { BarChart3, CheckCircle, Clock, Users, TrendingUp } from 'lucide-react';

async function getReportsData() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(today);
  monthAgo.setDate(monthAgo.getDate() - 30);

  const [
    completedToday,
    completedThisWeek,
    completedThisMonth,
    byDepartment,
    designerStats,
  ] = await Promise.all([
    prisma.file.count({
      where: {
        status: FileStatus.SENT_TO_PRODUCTION,
        closedAt: { gte: today },
      },
    }),
    prisma.file.count({
      where: {
        status: FileStatus.SENT_TO_PRODUCTION,
        closedAt: { gte: weekAgo },
      },
    }),
    prisma.file.count({
      where: {
        status: FileStatus.SENT_TO_PRODUCTION,
        closedAt: { gte: monthAgo },
      },
    }),
    prisma.file.groupBy({
      by: ['currentDepartmentId'],
      where: { status: FileStatus.SENT_TO_PRODUCTION, closedAt: { gte: monthAgo } },
      _count: { id: true },
    }),
    prisma.user.findMany({
      where: { role: 'GRAFIKER', isActive: true },
      select: {
        id: true,
        fullName: true,
        _count: {
          select: {
            assignedFiles: {
              where: { status: FileStatus.SENT_TO_PRODUCTION },
            },
          },
        },
      },
    }),
  ]);

  const deptIds = byDepartment.map((d) => d.currentDepartmentId).filter(Boolean);
  const departments = deptIds.length
    ? await prisma.department.findMany({
        where: { id: { in: deptIds } },
        select: { id: true, name: true, code: true },
      })
    : [];
  const deptMap: Record<string, { name: string; code: string }> = Object.fromEntries(
    departments.map((d) => [d.id, { name: d.name, code: d.code }])
  );

  return {
    completedToday,
    completedThisWeek,
    completedThisMonth,
    byDepartment: byDepartment.map((d) => ({
      department: deptMap[d.currentDepartmentId]?.name ?? 'Bilinmiyor',
      code: deptMap[d.currentDepartmentId]?.code ?? '',
      count: d._count.id,
    })),
    designerStats: designerStats.map((u) => ({
      name: u.fullName,
      completedCount: u._count.assignedFiles,
    })),
  };
}

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role !== 'ADMIN') redirect('/dashboard');

  const data = await getReportsData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Raporlar</h1>
        <p className="text-gray-500">Dönemsel özet ve performans metrikleri</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bugün Tamamlanan</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{data.completedToday}</div>
            <p className="text-xs text-muted-foreground">Üretime gönderilen dosya</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bu Hafta</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.completedThisWeek}</div>
            <p className="text-xs text-muted-foreground">Son 7 gün</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bu Ay</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.completedThisMonth}</div>
            <p className="text-xs text-muted-foreground">Son 30 gün</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Departmana Göre Tamamlanan (Son 30 Gün)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.byDepartment.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">Veri yok</p>
            ) : (
              <ul className="space-y-3">
                {data.byDepartment.map((d) => (
                  <li key={d.code} className="flex justify-between items-center">
                    <span>{d.department}</span>
                    <span className="font-semibold">{d.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Grafiker Tamamlanan İş Sayısı
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.designerStats.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">Veri yok</p>
            ) : (
              <ul className="space-y-3">
                {data.designerStats.map((d) => (
                  <li key={d.name} className="flex justify-between items-center">
                    <span>{d.name}</span>
                    <span className="font-semibold">{d.completedCount}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
