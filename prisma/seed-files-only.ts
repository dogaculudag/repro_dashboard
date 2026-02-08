/**
 * Sadece dosya seed'i.
 * Kişi/profil seed'i yok. Tüm dosyalar yeni gelmiş, üzerinde işlem yapılmamış (AWAITING_ASSIGNMENT).
 * Timer, Note, AuditLog eklenmez — sadece File kayıtları.
 *
 * Kullanım: npx tsx prisma/seed-files-only.ts
 * (Önce ana seed veya migrate gerekir: Department ONREPRO, LocationSlot, FileType GENEL mevcut olmalı)
 */

import { PrismaClient, FileStatus, Priority, LocationArea, Stage } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Sadece dosya seed başlatılıyor...');

  // Gerekli referanslar (ana seed'de oluşturulmuş olmalı)
  const onrepro = await prisma.department.findFirst({ where: { code: 'ONREPRO' } });
  if (!onrepro) {
    throw new Error('ONREPRO departmanı bulunamadı. Önce ana seed çalıştırın: npm run db:seed');
  }

  const slots = await prisma.locationSlot.findMany({ where: { area: LocationArea.WAITING }, take: 10 });
  if (slots.length === 0) {
    throw new Error('Bekleme alanı slot bulunamadı. Önce ana seed çalıştırın: npm run db:seed');
  }
  const slotMap = Object.fromEntries(slots.map(s => [s.code, s]));

  let genelFileType = await prisma.fileType.findFirst({ where: { name: 'GENEL' } });
  if (!genelFileType) {
    genelFileType = await prisma.fileType.create({
      data: {
        name: 'GENEL',
        description: 'Varsayılan dosya tipi',
        defaultDifficultyLevel: 3,
        defaultDifficultyWeight: 1.0,
      },
    });
  }

  // Mevcut seed dosya numaralarıyla çakışmaması için yüksek aralık kullanıyoruz (REP-2026-0100+)
  const fileNoStart = 100;
  const fileCount = 20;

  const customers = [
    { name: 'Saueressig Ambalaj', no: 'CUST-S001', orderName: 'Sipariş SAU-2026-01' },
    { name: 'Beta Folyo Ltd.', no: 'CUST-S002', orderName: 'Yılbaşı etiketleri' },
    { name: 'Delta Matbaa A.Ş.', no: 'CUST-S003', orderName: 'Katalog kapak' },
    { name: 'Epsilon Gıda San.', no: 'CUST-S004', orderName: 'Çikolata paketi' },
    { name: 'Gamma Kozmetik', no: 'CUST-S005', orderName: 'Parfüm kutusu' },
    { name: 'Omega Tekstil', no: 'CUST-S006', orderName: 'Tişört baskı' },
    { name: 'Sigma İlaç', no: 'CUST-S007', orderName: 'Prospektüs 2026' },
    { name: 'Theta Otomotiv', no: 'CUST-S008', orderName: 'Araç etiket serisi' },
    { name: 'Zeta Medikal', no: 'CUST-S009', orderName: 'Steril paket baskı' },
    { name: 'Eta Elektronik', no: 'CUST-S010', orderName: 'Kutu üretim baskı' },
    { name: 'Kappa Deri', no: 'CUST-S011', orderName: 'Etiket yeni tasarım' },
    { name: 'Lambda Temizlik', no: 'CUST-S012', orderName: 'Deterjan etiket' },
    { name: 'Mu Tarım', no: 'CUST-S013', orderName: 'Tohum paketi' },
    { name: 'Nu İnşaat', no: 'CUST-S014', orderName: 'Ürün kataloğu' },
    { name: 'Xi Perakende', no: 'CUST-S015', orderName: 'Promosyon etiket seti' },
    { name: 'Omicron Ambalaj', no: 'CUST-S016', orderName: 'Koli baskı' },
    { name: 'Pi Gıda', no: 'CUST-S017', orderName: 'Etiket revizyon' },
    { name: 'Rho Kimya', no: 'CUST-S018', orderName: 'Tehlike etiketi' },
    { name: 'Tau Tekstil 2', no: 'CUST-S019', orderName: 'Baskı provası' },
    { name: 'Upsilon Medikal 2', no: 'CUST-S020', orderName: 'Ambalaj etiket' },
  ];

  const ksmPresets = [
    { width: 800, height: 600, colors: ['CMYK'], cylinder: 'C-080' },
    { width: 1000, height: 700, colors: ['Cyan', 'Magenta', 'Yellow', 'Black'], cylinder: 'C-100' },
    { width: 1200, height: 800, colors: ['Pantone 485', 'Black'], cylinder: 'C-120' },
    { width: 600, height: 400, colors: ['Spot Orange', 'Black'], cylinder: 'C-060' },
    { width: 1500, height: 1000, colors: ['CMYK', 'Spot'], cylinder: 'C-150' },
    { width: 900, height: 500, colors: ['CMYK'], cylinder: 'C-090' },
  ];

  const slotCodes = slots.map(s => s.code);
  const priorities = [Priority.NORMAL, Priority.NORMAL, Priority.HIGH, Priority.URGENT, Priority.LOW];

  for (let i = 0; i < fileCount; i++) {
    const num = fileNoStart + i;
    const fileNo = `REP-2026-${String(num).padStart(4, '0')}`;
    const cust = customers[i % customers.length];
    const slotCode = slotCodes[i % slotCodes.length];
    const slot = slotMap[slotCode];
    const ksm = ksmPresets[i % ksmPresets.length];
    const priority = priorities[i % priorities.length];
    const dueDate = new Date(Date.now() + (3 + (i % 10)) * 24 * 60 * 60 * 1000);

    await prisma.file.upsert({
      where: { fileNo },
      update: {
        status: FileStatus.AWAITING_ASSIGNMENT,
        stage: Stage.PRE_REPRO,
        assignedDesignerId: null,
        targetAssigneeId: null,
        currentDepartmentId: onrepro.id,
        currentLocationSlotId: slot?.id ?? null,
        fileTypeId: genelFileType.id,
        difficultyLevel: 2 + (i % 3),
        difficultyWeight: 0.8 + (i % 5) * 0.1,
        priority,
        dueDate,
        iterationNumber: 1,
        iterationLabel: 'MG1',
        pendingTakeover: false,
      },
      create: {
        fileNo,
        customerName: cust.name,
        customerNo: cust.no,
        orderName: cust.orderName,
        ksmData: ksm,
        status: FileStatus.AWAITING_ASSIGNMENT,
        stage: Stage.PRE_REPRO,
        currentDepartmentId: onrepro.id,
        currentLocationSlotId: slot?.id ?? null,
        fileTypeId: genelFileType.id,
        difficultyLevel: 2 + (i % 3),
        difficultyWeight: 0.8 + (i % 5) * 0.1,
        priority,
        dueDate,
        iterationNumber: 1,
        iterationLabel: 'MG1',
      },
    });
  }

  console.log(`✅ ${fileCount} adet yeni dosya seed'lendi (REP-2026-${String(fileNoStart).padStart(4, '0')} .. REP-2026-${String(fileNoStart + fileCount - 1).padStart(4, '0')}).`);
  console.log('   Tüm dosyalar: AWAITING_ASSIGNMENT, PRE_REPRO, atama/not/timer yok.');
  console.log('🎉 Dosya seed tamamlandı.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
