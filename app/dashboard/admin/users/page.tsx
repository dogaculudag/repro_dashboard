import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { AdminUsersClient } from './admin-users-client';

async function getUsers() {
  return prisma.user.findMany({
    select: {
      id: true,
      username: true,
      fullName: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      department: {
        select: { id: true, name: true, code: true },
      },
    },
    orderBy: { fullName: 'asc' },
  });
}

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role !== 'ADMIN') redirect('/dashboard');

  const users = await getUsers();

  const serialized = users.map((u) => ({
    ...u,
    createdAt: u.createdAt instanceof Date ? u.createdAt.toISOString() : String(u.createdAt),
  }));

  return <AdminUsersClient initialUsers={serialized} />;
}
