import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <h1 className="text-6xl font-bold text-gray-900">404</h1>
      <p className="mt-2 text-lg text-gray-600">Sayfa bulunamadı.</p>
      <p className="mt-1 text-sm text-gray-500">
        Aradığınız sayfa mevcut değil veya taşınmış olabilir.
      </p>
      <div className="mt-8 flex gap-4">
        <Link href="/">
          <Button>Ana Sayfa</Button>
        </Link>
        <Link href="/login">
          <Button variant="outline">Giriş Yap</Button>
        </Link>
      </div>
    </div>
  );
}
