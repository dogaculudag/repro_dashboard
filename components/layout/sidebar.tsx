'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ROLE_LABELS } from '@/lib/utils';
import type { Role } from '@prisma/client';
import {
  LayoutDashboard,
  FileText,
  Users,
  BarChart3,
  Settings,
  FolderOpen,
  ClipboardList,
  Clock,
  Tags,
  TrendingUp,
} from 'lucide-react';

interface SidebarProps {
  user: {
    fullName: string;
    role: Role;
  };
}

const navigation = [
  { name: 'Ana Sayfa', href: '/dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'ONREPRO', 'GRAFIKER', 'KALITE', 'KOLAJ'] },
  { name: 'Atama Havuzu', href: '/dashboard/assignments', icon: ClipboardList, roles: ['ADMIN'] },
  { name: 'Dosya Oluştur', href: '/dashboard/files/new', icon: FolderOpen, roles: ['ADMIN', 'ONREPRO'] },
  { name: 'Dosyalarım', href: '/dashboard/queue', icon: Clock, roles: ['GRAFIKER', 'KALITE', 'KOLAJ', 'ONREPRO'] },
  { name: 'Tüm Dosyalar', href: '/dashboard/files', icon: FileText, roles: ['ADMIN', 'ONREPRO'] },
  { name: 'Raporlar', href: '/dashboard/reports', icon: BarChart3, roles: ['ADMIN'] },
  { name: 'Analitik', href: '/dashboard/admin/analytics', icon: TrendingUp, roles: ['ADMIN'] },
  { name: 'Dosya Tipleri', href: '/dashboard/admin/file-types', icon: Tags, roles: ['ADMIN'] },
  { name: 'Kullanıcılar', href: '/dashboard/admin/users', icon: Users, roles: ['ADMIN'] },
  { name: 'Ayarlar', href: '/dashboard/admin/settings', icon: Settings, roles: ['ADMIN'] },
];

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();

  const filteredNav = navigation.filter((item) =>
    item.roles.includes(user.role)
  );

  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
      <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-white px-6 pb-4">
        <div className="flex h-16 shrink-0 items-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-lg font-bold text-white">R</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Repro</h1>
              <p className="text-xs text-gray-500">Dosya Takip</p>
            </div>
          </div>
        </div>
        <nav className="flex flex-1 flex-col">
          <ul role="list" className="flex flex-1 flex-col gap-y-7">
            <li>
              <ul role="list" className="-mx-2 space-y-1">
                {filteredNav.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={cn(
                        pathname === item.href
                          ? 'bg-gray-100 text-primary'
                          : 'text-gray-700 hover:text-primary hover:bg-gray-50',
                        'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-medium'
                      )}
                    >
                      <item.icon
                        className={cn(
                          pathname === item.href
                            ? 'text-primary'
                            : 'text-gray-400 group-hover:text-primary',
                          'h-5 w-5 shrink-0'
                        )}
                        aria-hidden="true"
                      />
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
            <li className="mt-auto">
              <div className="flex items-center gap-x-3 px-2 py-3 text-sm">
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-600">
                    {user.fullName.charAt(0)}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user.fullName}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {ROLE_LABELS[user.role]}
                  </p>
                </div>
              </div>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
}
