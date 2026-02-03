import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { FileStatus, Priority } from '@prisma/client';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { STATUS_LABELS, STATUS_COLORS, PRIORITY_LABELS } from '@/lib/utils';
import { Plus, Search } from 'lucide-react';
import { FilesRow } from './files-row';

interface PageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function FilesPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  const page = Number(searchParams.page) || 1;
  const limit = 20;
  const search = searchParams.search as string | undefined;
  const status = searchParams.status as string | undefined;
  const departmentId = searchParams.departmentId as string | undefined;
  const fileTypeId = searchParams.fileTypeId as string | undefined;
  const assignedDesignerId = searchParams.assignedDesignerId as string | undefined;
  const difficultyLevel = searchParams.difficultyLevel as string | undefined;

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { fileNo: { contains: search, mode: 'insensitive' } },
      { customerName: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (status) where.status = status as FileStatus;
  if (departmentId) where.currentDepartmentId = departmentId;
  if (fileTypeId) where.fileTypeId = fileTypeId;
  if (assignedDesignerId) where.assignedDesignerId = assignedDesignerId;
  if (difficultyLevel) where.difficultyLevel = parseInt(difficultyLevel, 10);

  const [files, total, fileTypes, designers, departments] = await Promise.all([
    prisma.file.findMany({
      where,
      include: {
        assignedDesigner: { select: { id: true, fullName: true } },
        currentDepartment: { select: { id: true, name: true, code: true } },
        currentLocationSlot: { select: { id: true, code: true, name: true } },
        fileType: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.file.count({ where }),
    session.user.role === 'ADMIN' ? prisma.fileType.findMany({ orderBy: { name: 'asc' } }) : [],
    session.user.role === 'ADMIN' ? prisma.user.findMany({ where: { isActive: true }, select: { id: true, fullName: true }, orderBy: { fullName: 'asc' } }) : [],
    prisma.department.findMany({ select: { id: true, name: true, code: true }, orderBy: { sortOrder: 'asc' } }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tüm Dosyalar</h1>
          <p className="text-gray-500">{total} dosya bulundu</p>
        </div>
        {(session.user.role === 'ADMIN' || session.user.role === 'ONREPRO') && (
          <Link href="/dashboard/files/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Yeni Dosya
            </Button>
          </Link>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <form className="flex gap-4 flex-wrap" method="get">
            <input type="hidden" name="page" value="1" />
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  name="search"
                  placeholder="Dosya no veya müşteri ara..."
                  defaultValue={search}
                  className="w-full pl-10 pr-4 py-2 border rounded-md"
                />
              </div>
            </div>
            <select name="status" defaultValue={status || ''} className="border rounded-md px-3 py-2" aria-label="Durum">
              <option value="">Tüm Durumlar</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <select name="departmentId" defaultValue={departmentId || ''} className="border rounded-md px-3 py-2" aria-label="Departman">
              <option value="">Tüm Departmanlar</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            {session.user.role === 'ADMIN' && (
              <>
                <select name="fileTypeId" defaultValue={fileTypeId || ''} className="border rounded-md px-3 py-2">
                  <option value="">Tüm Tipler</option>
                  {fileTypes.map((ft) => (
                    <option key={ft.id} value={ft.id}>{ft.name}</option>
                  ))}
                </select>
                <select name="assignedDesignerId" defaultValue={assignedDesignerId || ''} className="border rounded-md px-3 py-2" aria-label="Sorumlu">
                  <option value="">Tüm Sorumlular</option>
                  {designers.map((u) => (
                    <option key={u.id} value={u.id}>{u.fullName}</option>
                  ))}
                </select>
                <select name="difficultyLevel" defaultValue={difficultyLevel || ''} className="border rounded-md px-3 py-2" aria-label="Zorluk seviyesi">
                  <option value="">Tüm Zorluklar</option>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </>
            )}
            <Button type="submit">Filtrele</Button>
          </form>
        </CardContent>
      </Card>

      {/* Files List */}
      <Card>
        <CardContent className="pt-6">
          {files.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Dosya bulunamadı</p>
            </div>
          ) : (
            <div className="space-y-4">
              {files.map((file) => (
                <FilesRow
                  key={file.id}
                  file={file}
                  isAdmin={session.user.role === 'ADMIN'}
                  fileTypes={fileTypes}
                  designers={designers}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              {page > 1 && (
                <Link href={`/dashboard/files?page=${page - 1}${search ? `&search=${search}` : ''}${status ? `&status=${status}` : ''}`}>
                  <Button variant="outline" size="sm">Önceki</Button>
                </Link>
              )}
              <span className="px-4 py-2 text-sm">
                Sayfa {page} / {totalPages}
              </span>
              {page < totalPages && (
                <Link href={`/dashboard/files?page=${page + 1}${search ? `&search=${search}` : ''}${status ? `&status=${status}` : ''}`}>
                  <Button variant="outline" size="sm">Sonraki</Button>
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
