'use client';

import { Badge } from '@/components/ui/badge';
import { ROLE_LABELS } from '@/lib/utils';
import { formatDisplayDate } from '@/lib/utils';

interface User {
  id: string;
  username: string;
  fullName: string;
  email: string | null;
  role: string;
  isActive: boolean;
  createdAt: Date;
  department: { id: string; name: string; code: string };
}

export function UserList({ users }: { users: User[] }) {
  if (users.length === 0) {
    return <p className="text-muted-foreground text-center py-8">Kullanıcı bulunamadı</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-3 font-medium">Ad Soyad</th>
            <th className="text-left py-3 font-medium">Kullanıcı Adı</th>
            <th className="text-left py-3 font-medium">Rol</th>
            <th className="text-left py-3 font-medium">Departman</th>
            <th className="text-left py-3 font-medium">Durum</th>
            <th className="text-left py-3 font-medium">Kayıt Tarihi</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-b hover:bg-gray-50">
              <td className="py-3">{user.fullName}</td>
              <td className="py-3">{user.username}</td>
              <td className="py-3">
                <Badge variant="secondary">{ROLE_LABELS[user.role] ?? user.role}</Badge>
              </td>
              <td className="py-3">{user.department.name}</td>
              <td className="py-3">
                {user.isActive ? (
                  <Badge variant="success">Aktif</Badge>
                ) : (
                  <Badge variant="destructive">Pasif</Badge>
                )}
              </td>
              <td className="py-3 text-muted-foreground">
                {formatDisplayDate(user.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
