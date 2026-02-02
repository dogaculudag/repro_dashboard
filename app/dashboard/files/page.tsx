import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { FileStatus, Priority } from '@prisma/client';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { STATUS_LABELS, STATUS_COLORS, PRIORITY_LABELS, formatDisplayDate } from '@/lib/utils';
import { Plus, Search, ArrowRight } from 'lucide-react';

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

  const where: any = {};
  
  if (search) {
    where.OR = [
      { fileNo: { contains: search, mode: 'insensitive' } },
      { customerName: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (status) {
    where.status = status as FileStatus;
  }

  const [files, total] = await Promise.all([
    prisma.file.findMany({
      where,
      include: {
        assignedDesigner: { select: { id: true, fullName: true } },
        currentDepartment: { select: { id: true, name: true, code: true } },
        currentLocationSlot: { select: { id: true, code: true, name: true } },
      },
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.file.count({ where }),
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
          <form className="flex gap-4 flex-wrap">
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
            <select
              name="status"
              defaultValue={status || ''}
              className="border rounded-md px-3 py-2"
            >
              <option value="">Tüm Durumlar</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
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
                <Link
                  key={file.id}
                  href={`/dashboard/files/${file.id}`}
                  className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{file.fileNo}</span>
                        <Badge className={STATUS_COLORS[file.status]}>
                          {STATUS_LABELS[file.status]}
                        </Badge>
                        {file.priority !== 'NORMAL' && (
                          <Badge variant={file.priority === 'URGENT' ? 'destructive' : 'warning'}>
                            {PRIORITY_LABELS[file.priority]}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{file.customerName}</p>
                    </div>
                    <div className="text-right flex items-center gap-4">
                      <div>
                        <p className="text-sm">{file.currentDepartment.name}</p>
                        {file.assignedDesigner && (
                          <p className="text-xs text-muted-foreground">
                            {file.assignedDesigner.fullName}
                          </p>
                        )}
                        {file.currentLocationSlot && (
                          <p className="text-xs text-muted-foreground">
                            📍 {file.currentLocationSlot.code}
                          </p>
                        )}
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </Link>
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
