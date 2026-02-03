import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getUsersAnalytics } from '@/lib/services/analytics.service';
import { subDays } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { AnalyticsClient } from './analytics-client';

export default async function AdminAnalyticsPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role !== 'ADMIN') redirect('/dashboard');

  const to = new Date();
  const from = subDays(to, 30);
  const data = await getUsersAnalytics({ from, to });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Performans Analitiği</h1>
        <p className="text-gray-500">Kullanıcı bazlı süre, ağırlıklı puan ve tip/departman kırılımı</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Kullanıcı Özeti
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AnalyticsClient initialData={data} initialFrom={from.toISOString()} initialTo={to.toISOString()} />
        </CardContent>
      </Card>
    </div>
  );
}
