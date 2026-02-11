'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/components/ui/use-toast';
import { ROLE_LABELS, formatDisplayDate } from '@/lib/utils';
import { Users as UsersIcon, UserPlus, Trash2, Loader2 } from 'lucide-react';

interface User {
  id: string;
  username: string;
  fullName: string;
  email: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  department: { id: string; name: string; code: string };
}

interface Department {
  id: string;
  name: string;
  code: string;
}

interface AdminUsersClientProps {
  initialUsers: User[];
}

export function AdminUsersClient({ initialUsers }: AdminUsersClientProps) {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; fullName: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    role: 'GRAFIKER' as string,
    departmentId: '',
    password: '',
  });

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (data.success && data.data) setUsers(data.data);
    } catch {
      // keep current
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/departments');
      const data = await res.json();
      if (data.success && data.data) setDepartments(data.data);
    } catch {
      // keep empty
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const openAddModal = () => {
    setFormData({ fullName: '', username: '', role: 'GRAFIKER', departmentId: '', password: '' });
    setShowAddModal(true);
  };

  const handleAddUser = async () => {
    if (!formData.fullName.trim()) {
      toast({ title: 'Hata', description: 'Ad soyad zorunludur', variant: 'destructive' });
      return;
    }
    if (!formData.username.trim()) {
      toast({ title: 'Hata', description: 'Kullanıcı adı zorunludur', variant: 'destructive' });
      return;
    }
    if (!formData.departmentId) {
      toast({ title: 'Hata', description: 'Departman seçin', variant: 'destructive' });
      return;
    }
    if (formData.password && formData.password.length < 8) {
      toast({ title: 'Hata', description: 'Şifre en az 8 karakter olmalıdır', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: formData.fullName.trim(),
          username: formData.username.trim(),
          role: formData.role,
          departmentId: formData.departmentId,
          password: formData.password.trim() || undefined,
        }),
      });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'Ekleme başarısız');
      }

      setShowAddModal(false);
      await fetchUsers();
      router.refresh();

      const generatedPassword = data.data?.generatedPassword;
      if (generatedPassword) {
        toast({
          title: 'Kullanıcı eklendi',
          description: `Oluşturulan şifre: ${generatedPassword} (bir kez gösterilir, lütfen kaydedin)`,
          variant: 'default',
        });
      } else {
        toast({ title: 'Kullanıcı eklendi', description: data.data?.user?.fullName });
      }
    } catch (err: unknown) {
      toast({
        title: 'Hata',
        description: (err as Error).message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      const res = await fetch(`/api/admin/users/${deleteTarget.id}`, { method: 'DELETE' });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'Silme başarısız');
      }

      setDeleteTarget(null);
      await fetchUsers();
      router.refresh();
      toast({ title: 'Kullanıcı silindi', description: `${deleteTarget.fullName} pasife alındı` });
    } catch (err: unknown) {
      toast({
        title: 'Hata',
        description: (err as Error).message,
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kullanıcı Yönetimi</h1>
          <p className="text-gray-500">Sistem kullanıcılarını görüntüleyin ve yönetin</p>
        </div>
        <Button onClick={openAddModal}>
          <UserPlus className="mr-2 h-4 w-4" />
          Yeni Kullanıcı
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UsersIcon className="h-5 w-5" />
            Kullanıcı Listesi ({users.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Kullanıcı bulunamadı</p>
          ) : (
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
                    <th className="text-left py-3 font-medium">İşlemler</th>
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
                      <td className="py-3">
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={deletingId === user.id}
                          onClick={() => setDeleteTarget({ id: user.id, fullName: user.fullName })}
                        >
                          {deletingId === user.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Trash2 className="h-4 w-4 mr-1" />
                              Sil
                            </>
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add user modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>Yeni Kullanıcı</CardTitle>
              <p className="text-sm text-muted-foreground">
                Şifre boş bırakılırsa otomatik oluşturulur ve bir kez gösterilir.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Ad Soyad *</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => setFormData((p) => ({ ...p, fullName: e.target.value }))}
                  placeholder="Ad Soyad"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Kullanıcı Adı *</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData((p) => ({ ...p, username: e.target.value }))}
                  placeholder="username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Rol</Label>
                <Select value={formData.role} onValueChange={(v) => setFormData((p) => ({ ...p, role: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Rol seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROLE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="departmentId">Departman</Label>
                <Select
                  value={formData.departmentId}
                  onValueChange={(v) => setFormData((p) => ({ ...p, departmentId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Departman seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Şifre (opsiyonel)</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
                  placeholder="Boş bırakılırsa otomatik oluşturulur"
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" onClick={() => setShowAddModal(false)} disabled={loading}>
                  İptal
                </Button>
                <Button onClick={handleAddUser} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Ekleniyor...
                    </>
                  ) : (
                    'Ekle'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete confirm dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kullanıcıyı sil</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <>
                  <strong>{deleteTarget.fullName}</strong> kullanıcısı pasife alınacak. Devam etmek istiyor musunuz?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteUser();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
