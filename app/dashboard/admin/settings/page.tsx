import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock } from 'lucide-react';
import { DepartmentsList } from '@/components/admin/departments-list';

const AREA_LABELS: Record<string, string> = {
  WAITING: 'Bekleme',
  REPRO: 'Repro',
  QUALITY: 'Kalite',
  KOLAJ: 'Kolaj',
  ARCHIVE: 'Arşiv',
};

async function getSettingsData() {
  const [locations, slaTargets, departments] = await Promise.all([
    prisma.locationSlot.findMany({
      where: { isActive: true },
      orderBy: [{ area: 'asc' }, { row: 'asc' }, { column: 'asc' }],
    }),
    prisma.slaTarget.findMany({
      include: {
        department: { select: { name: true, code: true } },
      },
    }),
    prisma.department.findMany({
      orderBy: { sortOrder: 'asc' },
    }),
  ]);

  return { locations, slaTargets, departments };
}

export default async function AdminSettingsPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role !== 'ADMIN') redirect('/dashboard');

  const { locations, slaTargets, departments } = await getSettingsData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Ayarlar</h1>
        <p className="text-gray-500">Konumlar, SLA hedefleri ve sistem ayarları</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <DepartmentsList departments={departments} />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              SLA Hedefleri (Saat)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {slaTargets.length === 0 ? (
              <p className="text-muted-foreground text-sm">Tanımlı SLA yok</p>
            ) : (
              <ul className="space-y-2">
                {slaTargets.map((sla) => (
                  <li key={sla.id} className="flex justify-between items-center py-2 border-b last:border-0">
                    <span>{sla.department.name}</span>
                    <span className="text-sm text-muted-foreground">
                      Uyarı: {sla.warningHours}s · Kritik: {sla.criticalHours}s
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Konum Slotları ({locations.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium">Kod</th>
                  <th className="text-left py-2 font-medium">İsim</th>
                  <th className="text-left py-2 font-medium">Alan</th>
                  <th className="text-left py-2 font-medium">Satır / Sütun</th>
                </tr>
              </thead>
              <tbody>
                {locations.map((loc) => (
                  <tr key={loc.id} className="border-b hover:bg-gray-50">
                    <td className="py-2 font-medium">{loc.code}</td>
                    <td className="py-2">{loc.name}</td>
                    <td className="py-2">
                      <Badge variant="secondary">{AREA_LABELS[loc.area] ?? loc.area}</Badge>
                    </td>
                    <td className="py-2 text-muted-foreground">
                      {loc.row} / {loc.column}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
