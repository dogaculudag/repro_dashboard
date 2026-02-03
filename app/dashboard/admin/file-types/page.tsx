import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getAllFileTypes } from '@/lib/services/file-type.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tags } from 'lucide-react';
import { FileTypesClient } from './file-types-client';

export default async function AdminFileTypesPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role !== 'ADMIN') redirect('/dashboard');

  const fileTypes = await getAllFileTypes();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dosya Tipleri</h1>
        <p className="text-gray-500">Dosya tiplerini oluşturun ve yönetin (varsayılan zorluk/ağırlık)</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tags className="h-5 w-5" />
            Tipler ({fileTypes.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FileTypesClient initialFileTypes={fileTypes} />
        </CardContent>
      </Card>
    </div>
  );
}
