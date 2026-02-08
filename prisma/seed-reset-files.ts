/**
 * Eski dosya verilerini temizler ve 80 adet PRE_REPRO dosyası seed'ler.
 * User, Department, Role tablolarına DOKUNMAZ.
 *
 * Sadece development ortamında çalışır (NODE_ENV=production ise hata fırlatır).
 *
 * Kullanım: npx tsx prisma/seed-reset-files.ts
 * Gereksinim: ONREPRO departmanı ve en az bir LocationSlot (WAITING) mevcut olmalı.
 */

import { PrismaClient, FileStatus, Priority, Stage, LocationArea } from '@prisma/client';

const prisma = new PrismaClient();

const FILE_COUNT = 80;
const FILE_NO_PREFIX = 'REP-2026';

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Bu seed sadece development ortamında çalıştırılabilir. NODE_ENV=production ile çalıştırmayın.');
  }

  console.log('🧹 Dosya iş verileri temizleniyor (User/Department/Role dokunulmuyor)...');

  await prisma.$transaction(async (tx) => {
    // Önce File'a bağlı child tabloları sil (FK ilişkisi; sıra önemli)
    const r1 = await tx.workSession.deleteMany({});
    const r2 = await tx.timeEntry.deleteMany({});
    const r3 = await tx.timer.deleteMany({});
    const r4 = await tx.note.deleteMany({});
    const r5 = await tx.auditLog.deleteMany({});
    const r6 = await tx.file.deleteMany({});

    console.log(`   WorkSession: ${r1.count}, TimeEntry: ${r2.count}, Timer: ${r3.count}, Note: ${r4.count}, AuditLog: ${r5.count}, File: ${r6.count}`);
  });

  console.log('✅ Temizlik tamamlandı.');

  // Mevcut referanslar (User/Department'a dokunmuyoruz, sadece okuyoruz)
  const onrepro = await prisma.department.findFirst({ where: { code: 'ONREPRO' } });
  if (!onrepro) {
    throw new Error('ONREPRO departmanı bulunamadı. User/Department verisi değiştirilmiyor; önce ana seed çalıştırın.');
  }

  const slot = await prisma.locationSlot.findFirst({ where: { area: LocationArea.WAITING } });
  if (!slot) {
    throw new Error('LocationSlot yok, önce slot oluşturun (ana seed veya location seed çalıştırın).');
  }

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

  const priorities: Priority[] = [Priority.LOW, Priority.NORMAL, Priority.NORMAL, Priority.HIGH];
  const customers = [
    { name: 'Saueressig Ambalaj', no: 'CUST-001' },
    { name: 'Beta Folyo Ltd.', no: 'CUST-002' },
    { name: 'Delta Matbaa A.Ş.', no: 'CUST-003' },
    { name: 'Epsilon Gıda San.', no: 'CUST-004' },
    { name: 'Gamma Kozmetik', no: 'CUST-005' },
    { name: 'Omega Tekstil', no: 'CUST-006' },
    { name: 'Sigma İlaç', no: 'CUST-007' },
    { name: 'Theta Otomotiv', no: 'CUST-008' },
    { name: 'Zeta Medikal', no: 'CUST-009' },
    { name: 'Eta Elektronik', no: 'CUST-010' },
  ];

  const now = Date.now();
  const tenDaysMs = 10 * 24 * 60 * 60 * 1000;

  console.log(`🌱 ${FILE_COUNT} adet PRE_REPRO dosyası oluşturuluyor...`);

  for (let i = 0; i < FILE_COUNT; i++) {
    const num = i + 1;
    const fileNo = `${FILE_NO_PREFIX}-${String(num).padStart(4, '0')}`;
    const cust = customers[i % customers.length];
    const priority = priorities[i % priorities.length];
    // Son 10 güne yayılmış createdAt
    const createdAt = new Date(now - tenDaysMs + (i / Math.max(FILE_COUNT - 1, 1)) * tenDaysMs);

    await prisma.file.create({
      data: {
        fileNo,
        customerName: cust.name,
        customerNo: cust.no,
        orderName: `Sipariş-${fileNo}`,
        status: FileStatus.AWAITING_ASSIGNMENT,
        stage: Stage.PRE_REPRO,
        assignedDesignerId: null,
        targetAssigneeId: null,
        currentDepartmentId: onrepro.id,
        currentLocationSlotId: slot.id,
        fileTypeId: genelFileType.id,
        difficultyLevel: 2 + (i % 3),
        difficultyWeight: 1.0,
        priority,
        requiresApproval: true,
        createdAt,
      },
    });
  }

  console.log(`✅ ${FILE_COUNT} adet dosya seed'lendi (${FILE_NO_PREFIX}-0001 .. ${FILE_NO_PREFIX}-${String(FILE_COUNT).padStart(4, '0')}).`);
  console.log('   Tüm dosyalar: stage=PRE_REPRO, assignedDesignerId=null, status=AWAITING_ASSIGNMENT.');
  console.log('🎉 Tamamlandı. Ön Repro kuyruğu ekranında dolu görünecektir.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
