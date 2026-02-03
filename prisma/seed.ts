import { PrismaClient, Role, FileStatus, Priority, LocationArea } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // ========================================
  // 1. Create Departments
  // ========================================
  console.log('Creating departments...');
  
  const departments = await Promise.all([
    prisma.department.upsert({
      where: { code: 'ADMIN' },
      update: {},
      create: { name: 'Yönetim', code: 'ADMIN', sortOrder: 0 },
    }),
    prisma.department.upsert({
      where: { code: 'ONREPRO' },
      update: {},
      create: { name: 'Ön Repro', code: 'ONREPRO', sortOrder: 1 },
    }),
    prisma.department.upsert({
      where: { code: 'REPRO' },
      update: {},
      create: { name: 'Repro', code: 'REPRO', sortOrder: 2 },
    }),
    prisma.department.upsert({
      where: { code: 'KALITE' },
      update: {},
      create: { name: 'Kalite', code: 'KALITE', sortOrder: 3 },
    }),
    prisma.department.upsert({
      where: { code: 'KOLAJ' },
      update: {},
      create: { name: 'Kolaj', code: 'KOLAJ', sortOrder: 4 },
    }),
    prisma.department.upsert({
      where: { code: 'CUSTOMER' },
      update: {},
      create: { name: 'Müşteri Onayı', code: 'CUSTOMER', isVirtual: true, sortOrder: 5 },
    }),
  ]);

  const deptMap = Object.fromEntries(departments.map(d => [d.code, d]));
  console.log(`✅ Created ${departments.length} departments`);

  // ========================================
  // 2. Create SLA Targets
  // ========================================
  console.log('Creating SLA targets...');

  await Promise.all([
    prisma.slaTarget.upsert({
      where: { departmentId: deptMap.ONREPRO.id },
      update: {},
      create: { departmentId: deptMap.ONREPRO.id, warningHours: 4, criticalHours: 8 },
    }),
    prisma.slaTarget.upsert({
      where: { departmentId: deptMap.REPRO.id },
      update: {},
      create: { departmentId: deptMap.REPRO.id, warningHours: 24, criticalHours: 48 },
    }),
    prisma.slaTarget.upsert({
      where: { departmentId: deptMap.KALITE.id },
      update: {},
      create: { departmentId: deptMap.KALITE.id, warningHours: 4, criticalHours: 8 },
    }),
    prisma.slaTarget.upsert({
      where: { departmentId: deptMap.KOLAJ.id },
      update: {},
      create: { departmentId: deptMap.KOLAJ.id, warningHours: 8, criticalHours: 16 },
    }),
    prisma.slaTarget.upsert({
      where: { departmentId: deptMap.CUSTOMER.id },
      update: {},
      create: { departmentId: deptMap.CUSTOMER.id, warningHours: 48, criticalHours: 120 },
    }),
  ]);
  console.log('✅ Created SLA targets');

  // ========================================
  // 3. Create Users
  // ========================================
  console.log('Creating users...');
  
  const passwordHash = await bcrypt.hash('password123', 10);

  const users = await Promise.all([
    // Admin/Manager
    prisma.user.upsert({
      where: { username: 'bahar' },
      update: {},
      create: {
        username: 'bahar',
        passwordHash,
        fullName: 'Bahar Hanım',
        email: 'bahar@company.com',
        role: Role.ADMIN,
        departmentId: deptMap.ADMIN.id,
      },
    }),
    // Önrepro Staff
    prisma.user.upsert({
      where: { username: 'onrepro1' },
      update: {},
      create: {
        username: 'onrepro1',
        passwordHash,
        fullName: 'Mehmet Yılmaz',
        email: 'mehmet@company.com',
        role: Role.ONREPRO,
        departmentId: deptMap.ONREPRO.id,
      },
    }),
    prisma.user.upsert({
      where: { username: 'onrepro2' },
      update: {},
      create: {
        username: 'onrepro2',
        passwordHash,
        fullName: 'Ayşe Kaya',
        email: 'ayse@company.com',
        role: Role.ONREPRO,
        departmentId: deptMap.ONREPRO.id,
      },
    }),
    // Grafiker (Designers)
    prisma.user.upsert({
      where: { username: 'grafiker1' },
      update: {},
      create: {
        username: 'grafiker1',
        passwordHash,
        fullName: 'Ali Demir',
        email: 'ali@company.com',
        role: Role.GRAFIKER,
        departmentId: deptMap.REPRO.id,
      },
    }),
    prisma.user.upsert({
      where: { username: 'grafiker2' },
      update: {},
      create: {
        username: 'grafiker2',
        passwordHash,
        fullName: 'Zeynep Öz',
        email: 'zeynep@company.com',
        role: Role.GRAFIKER,
        departmentId: deptMap.REPRO.id,
      },
    }),
    prisma.user.upsert({
      where: { username: 'grafiker3' },
      update: {},
      create: {
        username: 'grafiker3',
        passwordHash,
        fullName: 'Can Yıldız',
        email: 'can@company.com',
        role: Role.GRAFIKER,
        departmentId: deptMap.REPRO.id,
      },
    }),
    // Quality Staff
    prisma.user.upsert({
      where: { username: 'kalite1' },
      update: {},
      create: {
        username: 'kalite1',
        passwordHash,
        fullName: 'Fatma Şahin',
        email: 'fatma@company.com',
        role: Role.KALITE,
        departmentId: deptMap.KALITE.id,
      },
    }),
    // Kolaj Staff
    prisma.user.upsert({
      where: { username: 'kolaj1' },
      update: {},
      create: {
        username: 'kolaj1',
        passwordHash,
        fullName: 'Hasan Çelik',
        email: 'hasan@company.com',
        role: Role.KOLAJ,
        departmentId: deptMap.KOLAJ.id,
      },
    }),
  ]);

  const userMap = Object.fromEntries(users.map(u => [u.username, u]));
  console.log(`✅ Created ${users.length} users`);

  // ========================================
  // 4. Create Location Slots
  // ========================================
  console.log('Creating location slots...');

  const locationData: Array<{
    code: string;
    name: string;
    area: LocationArea;
    row: number;
    column: number;
  }> = [];

  // Waiting Area (A1-A10)
  for (let i = 1; i <= 10; i++) {
    locationData.push({
      code: `A${i}`,
      name: `Bekleme Alanı ${i}`,
      area: LocationArea.WAITING,
      row: Math.ceil(i / 5),
      column: ((i - 1) % 5) + 1,
    });
  }

  // Repro Desks (R1-R10)
  for (let i = 1; i <= 10; i++) {
    locationData.push({
      code: `R${i}`,
      name: `Repro Masası ${i}`,
      area: LocationArea.REPRO,
      row: Math.ceil(i / 5),
      column: ((i - 1) % 5) + 1,
    });
  }

  // Quality Shelf (Q1-Q5)
  for (let i = 1; i <= 5; i++) {
    locationData.push({
      code: `Q${i}`,
      name: `Kalite Rafı ${i}`,
      area: LocationArea.QUALITY,
      row: 1,
      column: i,
    });
  }

  // Kolaj Area (K1-K5)
  for (let i = 1; i <= 5; i++) {
    locationData.push({
      code: `K${i}`,
      name: `Kolaj Alanı ${i}`,
      area: LocationArea.KOLAJ,
      row: 1,
      column: i,
    });
  }

  for (const loc of locationData) {
    await prisma.locationSlot.upsert({
      where: { code: loc.code },
      update: {},
      create: loc,
    });
  }

  const slots = await prisma.locationSlot.findMany();
  const slotMap = Object.fromEntries(slots.map(s => [s.code, s]));
  console.log(`✅ Created ${slots.length} location slots`);

  // ========================================
  // 5. Create default FileType (GENEL)
  // ========================================
  console.log('Creating default file type...');
  const genelFileType = await prisma.fileType.upsert({
    where: { name: 'GENEL' },
    update: {},
    create: {
      name: 'GENEL',
      description: 'Varsayılan dosya tipi',
      defaultDifficultyLevel: 3,
      defaultDifficultyWeight: 1.0,
    },
  });
  console.log('✅ Created file type GENEL');

  // Ensure all existing files have fileTypeId and difficulty fields
  await prisma.file.updateMany({
    where: { fileTypeId: null },
    data: {
      fileTypeId: genelFileType.id,
      difficultyLevel: 3,
      difficultyWeight: 1.0,
    },
  });

  // ========================================
  // 6. Create Sample Files
  // ========================================
  console.log('Creating sample files...');

  // File 1: Awaiting Assignment
  const file1 = await prisma.file.upsert({
    where: { fileNo: 'REP-2026-0001' },
    update: { fileTypeId: genelFileType.id, difficultyLevel: 3, difficultyWeight: 1.0 },
    create: {
      fileNo: 'REP-2026-0001',
      customerName: 'ABC Ambalaj A.Ş.',
      customerNo: 'CUST-001',
      ksmData: {
        width: 1200,
        height: 800,
        colors: ['Cyan', 'Magenta', 'Yellow', 'Black'],
        cylinder: 'C-120',
      },
      status: FileStatus.AWAITING_ASSIGNMENT,
      currentDepartmentId: deptMap.ONREPRO.id,
      currentLocationSlotId: slotMap.A1.id,
      fileTypeId: genelFileType.id,
      difficultyLevel: 3,
      difficultyWeight: 1.0,
      priority: Priority.NORMAL,
    },
  });

  await prisma.auditLog.create({
    data: {
      fileId: file1.id,
      actionType: 'CREATE',
      toDepartmentId: deptMap.ONREPRO.id,
      byUserId: userMap.onrepro1.id,
      payload: { initial: true },
    },
  });

  // File 2: In Repro (Active)
  const file2 = await prisma.file.upsert({
    where: { fileNo: 'REP-2026-0002' },
    update: { fileTypeId: genelFileType.id, difficultyLevel: 3, difficultyWeight: 1.0 },
    create: {
      fileNo: 'REP-2026-0002',
      customerName: 'XYZ Plastik Ltd.',
      customerNo: 'CUST-002',
      ksmData: {
        width: 800,
        height: 600,
        colors: ['Pantone 485', 'Black', 'White'],
        cylinder: 'C-080',
      },
      status: FileStatus.IN_REPRO,
      assignedDesignerId: userMap.grafiker1.id,
      currentDepartmentId: deptMap.REPRO.id,
      currentLocationSlotId: slotMap.R1.id,
      fileTypeId: genelFileType.id,
      difficultyLevel: 3,
      difficultyWeight: 1.0,
      priority: Priority.HIGH,
    },
  });

  await prisma.timer.create({
    data: {
      fileId: file2.id,
      departmentId: deptMap.REPRO.id,
      userId: userMap.grafiker1.id,
      startTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
  });

  // File 3: Awaiting Assignment (High Priority)
  await prisma.file.upsert({
    where: { fileNo: 'REP-2026-0003' },
    update: { fileTypeId: genelFileType.id, difficultyLevel: 3, difficultyWeight: 1.0 },
    create: {
      fileNo: 'REP-2026-0003',
      customerName: 'DEF Gıda San.',
      customerNo: 'CUST-003',
      ksmData: {
        width: 1000,
        height: 700,
        colors: ['CMYK'],
        cylinder: 'C-100',
      },
      status: FileStatus.AWAITING_ASSIGNMENT,
      currentDepartmentId: deptMap.ONREPRO.id,
      currentLocationSlotId: slotMap.A2.id,
      fileTypeId: genelFileType.id,
      difficultyLevel: 3,
      difficultyWeight: 1.0,
      priority: Priority.HIGH,
    },
  });

  // File 4: Customer Approval waiting
  const file4 = await prisma.file.upsert({
    where: { fileNo: 'REP-2026-0004' },
    update: { fileTypeId: genelFileType.id, difficultyLevel: 3, difficultyWeight: 1.0 },
    create: {
      fileNo: 'REP-2026-0004',
      customerName: 'GHI Kozmetik',
      customerNo: 'CUST-004',
      ksmData: {
        width: 600,
        height: 400,
        colors: ['Gold', 'Silver', 'Black'],
        cylinder: 'C-060',
      },
      status: FileStatus.CUSTOMER_APPROVAL,
      assignedDesignerId: userMap.grafiker2.id,
      currentDepartmentId: deptMap.CUSTOMER.id,
      currentLocationSlotId: slotMap.A5.id,
      fileTypeId: genelFileType.id,
      difficultyLevel: 3,
      difficultyWeight: 1.0,
      requiresApproval: true,
      priority: Priority.URGENT,
    },
  });

  await prisma.timer.create({
    data: {
      fileId: file4.id,
      departmentId: deptMap.CUSTOMER.id,
      userId: null,
      startTime: new Date(Date.now() - 48 * 60 * 60 * 1000),
    },
  });

  // File 5: In Quality
  const file5 = await prisma.file.upsert({
    where: { fileNo: 'REP-2026-0005' },
    update: { fileTypeId: genelFileType.id, difficultyLevel: 3, difficultyWeight: 1.0 },
    create: {
      fileNo: 'REP-2026-0005',
      customerName: 'JKL Tekstil',
      customerNo: 'CUST-005',
      ksmData: {
        width: 1500,
        height: 1000,
        colors: ['CMYK', 'Spot Orange'],
        cylinder: 'C-150',
      },
      status: FileStatus.IN_QUALITY,
      assignedDesignerId: userMap.grafiker3.id,
      currentDepartmentId: deptMap.KALITE.id,
      currentLocationSlotId: slotMap.Q1.id,
      fileTypeId: genelFileType.id,
      difficultyLevel: 3,
      difficultyWeight: 1.0,
      pendingTakeover: true,
      requiresApproval: false,
      priority: Priority.NORMAL,
    },
  });

  // File 6: Completed (Sent to Production)
  await prisma.file.upsert({
    where: { fileNo: 'REP-2026-0006' },
    update: { fileTypeId: genelFileType.id, difficultyLevel: 3, difficultyWeight: 1.0 },
    create: {
      fileNo: 'REP-2026-0006',
      customerName: 'MNO Kimya',
      customerNo: 'CUST-006',
      ksmData: {
        width: 900,
        height: 500,
        colors: ['CMYK'],
        cylinder: 'C-090',
      },
      status: FileStatus.SENT_TO_PRODUCTION,
      assignedDesignerId: userMap.grafiker1.id,
      currentDepartmentId: deptMap.KOLAJ.id,
      currentLocationSlotId: null,
      fileTypeId: genelFileType.id,
      difficultyLevel: 3,
      difficultyWeight: 1.0,
      priority: Priority.NORMAL,
      closedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
    },
  });

  // Add some notes
  await prisma.note.createMany({
    data: [
      {
        fileId: file2.id,
        userId: userMap.grafiker1.id,
        departmentId: deptMap.REPRO.id,
        message: 'Renk eşleştirmesi yapılıyor, müşteri talebi doğrultusunda Pantone değerleri kontrol edilecek.',
      },
      {
        fileId: file4.id,
        userId: userMap.onrepro2.id,
        departmentId: deptMap.ONREPRO.id,
        message: 'Müşteriye GMG proof gönderildi. Onay bekleniyor.',
      },
    ],
  });

  console.log('✅ Created sample files with timers and notes');

  console.log('');
  console.log('🎉 Seed completed successfully!');
  console.log('');
  console.log('Test credentials:');
  console.log('  Username: bahar     | Password: password123 | Role: Admin');
  console.log('  Username: onrepro1  | Password: password123 | Role: Önrepro');
  console.log('  Username: grafiker1 | Password: password123 | Role: Grafiker');
  console.log('  Username: kalite1   | Password: password123 | Role: Kalite');
  console.log('  Username: kolaj1    | Password: password123 | Role: Kolaj');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
