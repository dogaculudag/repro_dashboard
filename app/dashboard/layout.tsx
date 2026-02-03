import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { ActiveWorkSessionBanner } from '@/components/layout/active-work-session';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar user={session.user} />
      <div className="lg:pl-64">
        <Header user={session.user} />
        <ActiveWorkSessionBanner />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
