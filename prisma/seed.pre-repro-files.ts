/**
 * Sadece Ön Repro Kuyruğu için dosya seed'i.
 * Tüm dosyalar stage=PRE_REPRO, assignedDesignerId=null → kuyrukta görünür.
 * createdAt: 2019-01-01 + i dakika (eski ve artan → listede en başta).
 *
 * Kullanım: pnpm db:seed:pre-repro
 * Önce migrate gerekir; ONREPRO departmanı yoksa oluşturulur.
 */

import { PrismaClient, FileStatus, Priority, Stage } from '@prisma/client';

const prisma = new PrismaClient();

const FILE_COUNT = 15;
const BASE_DATE = new Date('2019-01-01T00:00:00.000Z');

const CUSTOMERS = [
  { name: 'Alfa Ambalaj', no: 'CUST-A001', order: 'Sipariş ALF-2019-01' },
  { name: 'Beta Folyo', no: 'CUST-B002', order: 'Etiket serisi' },
  { name: 'Gamma Matbaa', no: 'CUST-G003', order: 'Katalog baskı' },
  { name: 'Delta Gıda', no: 'CUST-D004', order: 'Ürün paketi' },
  { name: 'Epsilon Kozmetik', no: 'CUST-E005', order: 'Parfüm kutusu' },
  { name: 'Zeta Tekstil', no: 'CUST-Z006', order: 'Tişört baskı' },
  { name: 'Eta İlaç', no: 'CUST-H007', order: 'Prospektüs' },
  { name: 'Theta Otomotiv', no: 'CUST-T008', order: 'Araç etiket' },
  { name: 'Iota Medikal', no: 'CUST-I009', order: 'Steril paket' },
  { name: 'Kappa Deri', no: 'CUST-K010', order: 'Etiket tasarım' },
];

async function main() {
  console.log('🌱 Ön Repro Kuyruğu dosya seed başlatılıyor...');

  let onrepro = await prisma.department.findFirst({ where: { code: 'ONREPRO' } });
  if (!onrepro) {
    onrepro = await prisma.department.create({
      data: {
        name: 'Ön Repro',
        code: 'ONREPRO',
        isVirtual: false,
        sortOrder: 1,
      },
    });
    console.log('   ONREPRO departmanı oluşturuldu.');
  }

  const fileNoStart = 2000;
  const priorities: Priority[] = [Priority.NORMAL, Priority.HIGH, Priority.URGENT, Priority.LOW];

  for (let i = 0; i < FILE_COUNT; i++) {
    const num = fileNoStart + i;
    const fileNo = `REP-2019-${String(num).padStart(4, '0')}`;
    const cust = CUSTOMERS[i % CUSTOMERS.length];
    const createdAt = new Date(BASE_DATE.getTime() + i * 60 * 1000);
    const priority = priorities[i % priorities.length];
    const dueDate = new Date(createdAt.getTime() + (5 + (i % 7)) * 24 * 60 * 60 * 1000);

    await prisma.file.upsert({
      where: { fileNo },
      update: {
        stage: Stage.PRE_REPRO,
        assignedDesignerId: null,
        status: FileStatus.AWAITING_ASSIGNMENT,
        currentDepartmentId: onrepro.id,
        createdAt,
        priority,
        dueDate,
      },
      create: {
        fileNo,
        customerName: cust.name,
        customerNo: cust.no,
        orderName: cust.order,
        status: FileStatus.AWAITING_ASSIGNMENT,
        stage: Stage.PRE_REPRO,
        assignedDesignerId: null,
        currentDepartmentId: onrepro.id,
        createdAt,
        priority,
        dueDate,
      },
    });
  }

  console.log(`✅ ${FILE_COUNT} adet Ön Repro dosyası seed'lendi (REP-2019-${String(fileNoStart).padStart(4, '0')} .. REP-2019-${String(fileNoStart + FILE_COUNT - 1).padStart(4, '0')}).`);
  console.log('   Tüm dosyalar: stage=PRE_REPRO, assignedDesignerId=null, createdAt 2019-01-01+');
  console.log('   /dashboard/queues/pre-repro sayfasında görünür.');
  console.log('🎉 Seed tamamlandı.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
