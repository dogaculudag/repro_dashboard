import { PrismaClient, Role, FileStatus, Priority, LocationArea, Stage } from '@prisma/client';
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

  // File 1: Awaiting Assignment (Ön Repro kuyruğunda görünür)
  const file1 = await prisma.file.upsert({
    where: { fileNo: 'REP-2026-0001' },
    update: { fileTypeId: genelFileType.id, difficultyLevel: 3, difficultyWeight: 1.0, stage: Stage.PRE_REPRO },
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
      stage: Stage.PRE_REPRO,
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
    update: { fileTypeId: genelFileType.id, difficultyLevel: 3, difficultyWeight: 1.0, stage: Stage.REPRO },
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
      stage: Stage.REPRO,
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

  // File 3: Awaiting Assignment (High Priority) – Ön Repro kuyruğunda
  await prisma.file.upsert({
    where: { fileNo: 'REP-2026-0003' },
    update: { fileTypeId: genelFileType.id, difficultyLevel: 3, difficultyWeight: 1.0, stage: Stage.PRE_REPRO },
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
      stage: Stage.PRE_REPRO,
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
    update: { fileTypeId: genelFileType.id, difficultyLevel: 3, difficultyWeight: 1.0, stage: Stage.REPRO },
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
      stage: Stage.REPRO,
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
    update: { fileTypeId: genelFileType.id, difficultyLevel: 3, difficultyWeight: 1.0, stage: Stage.REPRO },
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
      stage: Stage.REPRO,
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
    update: { fileTypeId: genelFileType.id, difficultyLevel: 3, difficultyWeight: 1.0, stage: Stage.DONE },
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
      stage: Stage.DONE,
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

  // ========================================
  // 7–40: Extra sample files for testing (34 more files)
  // ========================================
  const customers = [
    { name: 'PQR Ambalaj', no: 'CUST-007' },
    { name: 'STU Medikal', no: 'CUST-008' },
    { name: 'VWX Otomotiv', no: 'CUST-009' },
    { name: 'YZA İlaç San.', no: 'CUST-010' },
    { name: 'BCD Tekstil', no: 'CUST-011' },
    { name: 'EFG Elektronik', no: 'CUST-012' },
    { name: 'HIJ Gıda', no: 'CUST-013' },
    { name: 'KLM Mobilya', no: 'CUST-014' },
    { name: 'NOP Boya', no: 'CUST-015' },
    { name: 'QRS Seramik', no: 'CUST-016' },
    { name: 'TUV Temizlik', no: 'CUST-017' },
    { name: 'WXY Tarım', no: 'CUST-018' },
    { name: 'ZAB İnşaat', no: 'CUST-019' },
    { name: 'CDE Perakende', no: 'CUST-020' },
    { name: 'FGH Otel', no: 'CUST-021' },
    { name: 'IJK Spor', no: 'CUST-022' },
    { name: 'LMN Kitap', no: 'CUST-023' },
    { name: 'OPQ Petrol', no: 'CUST-024' },
    { name: 'RST Cam', no: 'CUST-025' },
    { name: 'UVW Deri', no: 'CUST-026' },
    { name: 'XYZ Bahçe', no: 'CUST-027' },
    { name: 'AAB Tekstil 2', no: 'CUST-028' },
    { name: 'BCC Kozmetik 2', no: 'CUST-029' },
    { name: 'CDD Ambalaj 2', no: 'CUST-030' },
    { name: 'DEE Plastik 2', no: 'CUST-031' },
    { name: 'EFF Gıda 2', no: 'CUST-032' },
    { name: 'FGG Kimya 2', no: 'CUST-033' },
    { name: 'GHH Medikal 2', no: 'CUST-034' },
    { name: 'HII İlaç 2', no: 'CUST-035' },
    { name: 'IJJ Elektronik 2', no: 'CUST-036' },
    { name: 'JKK Otomotiv 2', no: 'CUST-037' },
    { name: 'KLL Seramik 2', no: 'CUST-038' },
    { name: 'LMM Boya 2', no: 'CUST-039' },
    { name: 'MNN Mobilya 2', no: 'CUST-040' },
  ];

  const statusConfigs: Array<{
    status: FileStatus;
    departmentCode: keyof typeof deptMap;
    slotCode: string | null;
    assignDesigner?: boolean;
    priority: Priority;
    withTimer?: boolean;
    withNote?: boolean;
  }> = [
    { status: FileStatus.AWAITING_ASSIGNMENT, departmentCode: 'ONREPRO', slotCode: 'A3', assignDesigner: false, priority: Priority.NORMAL },
    { status: FileStatus.ASSIGNED, departmentCode: 'ONREPRO', slotCode: 'A4', assignDesigner: true, priority: Priority.NORMAL },
    { status: FileStatus.IN_REPRO, departmentCode: 'REPRO', slotCode: 'R2', assignDesigner: true, priority: Priority.HIGH, withTimer: true },
    { status: FileStatus.IN_REPRO, departmentCode: 'REPRO', slotCode: 'R3', assignDesigner: true, priority: Priority.NORMAL, withTimer: true },
    { status: FileStatus.APPROVAL_PREP, departmentCode: 'REPRO', slotCode: 'R4', assignDesigner: true, priority: Priority.NORMAL },
    { status: FileStatus.CUSTOMER_APPROVAL, departmentCode: 'CUSTOMER', slotCode: 'A6', assignDesigner: true, priority: Priority.URGENT, withNote: true },
    { status: FileStatus.REVISION_REQUIRED, departmentCode: 'REPRO', slotCode: 'R5', assignDesigner: true, priority: Priority.HIGH },
    { status: FileStatus.IN_QUALITY, departmentCode: 'KALITE', slotCode: 'Q2', assignDesigner: true, priority: Priority.NORMAL },
    { status: FileStatus.IN_QUALITY, departmentCode: 'KALITE', slotCode: 'Q3', assignDesigner: true, priority: Priority.HIGH },
    { status: FileStatus.IN_KOLAJ, departmentCode: 'KOLAJ', slotCode: 'K1', assignDesigner: true, priority: Priority.NORMAL },
    { status: FileStatus.IN_KOLAJ, departmentCode: 'KOLAJ', slotCode: 'K2', assignDesigner: true, priority: Priority.LOW },
    { status: FileStatus.SENT_TO_PRODUCTION, departmentCode: 'KOLAJ', slotCode: null, assignDesigner: true, priority: Priority.NORMAL },
    { status: FileStatus.AWAITING_ASSIGNMENT, departmentCode: 'ONREPRO', slotCode: 'A7', assignDesigner: false, priority: Priority.LOW },
    { status: FileStatus.AWAITING_ASSIGNMENT, departmentCode: 'ONREPRO', slotCode: 'A8', assignDesigner: false, priority: Priority.HIGH },
    { status: FileStatus.IN_REPRO, departmentCode: 'REPRO', slotCode: 'R6', assignDesigner: true, priority: Priority.NORMAL, withTimer: true },
    { status: FileStatus.IN_REPRO, departmentCode: 'REPRO', slotCode: 'R7', assignDesigner: true, priority: Priority.LOW, withTimer: true },
    { status: FileStatus.CUSTOMER_APPROVAL, departmentCode: 'CUSTOMER', slotCode: 'A9', assignDesigner: true, priority: Priority.NORMAL },
    { status: FileStatus.IN_QUALITY, departmentCode: 'KALITE', slotCode: 'Q4', assignDesigner: true, priority: Priority.NORMAL },
    { status: FileStatus.IN_KOLAJ, departmentCode: 'KOLAJ', slotCode: 'K3', assignDesigner: true, priority: Priority.NORMAL },
    { status: FileStatus.SENT_TO_PRODUCTION, departmentCode: 'KOLAJ', slotCode: null, assignDesigner: true, priority: Priority.NORMAL },
    { status: FileStatus.AWAITING_ASSIGNMENT, departmentCode: 'ONREPRO', slotCode: 'A10', assignDesigner: false, priority: Priority.URGENT },
    { status: FileStatus.IN_REPRO, departmentCode: 'REPRO', slotCode: 'R8', assignDesigner: true, priority: Priority.HIGH, withTimer: true },
    { status: FileStatus.IN_REPRO, departmentCode: 'REPRO', slotCode: 'R9', assignDesigner: true, priority: Priority.NORMAL },
    { status: FileStatus.IN_QUALITY, departmentCode: 'KALITE', slotCode: 'Q5', assignDesigner: true, priority: Priority.LOW },
    { status: FileStatus.IN_KOLAJ, departmentCode: 'KOLAJ', slotCode: 'K4', assignDesigner: true, priority: Priority.HIGH },
    { status: FileStatus.SENT_TO_PRODUCTION, departmentCode: 'KOLAJ', slotCode: null, assignDesigner: true, priority: Priority.LOW },
    { status: FileStatus.AWAITING_ASSIGNMENT, departmentCode: 'ONREPRO', slotCode: 'A1', assignDesigner: false, priority: Priority.NORMAL },
    { status: FileStatus.ASSIGNED, departmentCode: 'ONREPRO', slotCode: 'A2', assignDesigner: true, priority: Priority.NORMAL },
    { status: FileStatus.IN_REPRO, departmentCode: 'REPRO', slotCode: 'R10', assignDesigner: true, priority: Priority.URGENT, withTimer: true },
    { status: FileStatus.CUSTOMER_APPROVAL, departmentCode: 'CUSTOMER', slotCode: 'A5', assignDesigner: true, priority: Priority.HIGH },
    { status: FileStatus.IN_KOLAJ, departmentCode: 'KOLAJ', slotCode: 'K5', assignDesigner: true, priority: Priority.NORMAL },
    { status: FileStatus.SENT_TO_PRODUCTION, departmentCode: 'KOLAJ', slotCode: null, assignDesigner: true, priority: Priority.NORMAL },
    { status: FileStatus.SENT_TO_PRODUCTION, departmentCode: 'KOLAJ', slotCode: null, assignDesigner: true, priority: Priority.NORMAL },
    { status: FileStatus.SENT_TO_PRODUCTION, departmentCode: 'KOLAJ', slotCode: null, assignDesigner: true, priority: Priority.HIGH },
    { status: FileStatus.AWAITING_ASSIGNMENT, departmentCode: 'ONREPRO', slotCode: 'A3', assignDesigner: false, priority: Priority.LOW },
    { status: FileStatus.IN_REPRO, departmentCode: 'REPRO', slotCode: 'R1', assignDesigner: true, priority: Priority.NORMAL, withTimer: true },
  ];

  const designers = [userMap.grafiker1.id, userMap.grafiker2.id, userMap.grafiker3.id];
  const ksmPresets = [
    { width: 800, height: 600, colors: ['CMYK'], cylinder: 'C-080' },
    { width: 1000, height: 700, colors: ['Cyan', 'Magenta', 'Yellow', 'Black'], cylinder: 'C-100' },
    { width: 1200, height: 800, colors: ['Pantone 485', 'Black'], cylinder: 'C-120' },
    { width: 600, height: 400, colors: ['Spot Orange', 'Black'], cylinder: 'C-060' },
    { width: 1500, height: 1000, colors: ['CMYK', 'Spot'], cylinder: 'C-150' },
  ];

  const createdFileIds: string[] = [];

  for (let i = 0; i < 34; i++) {
    const num = i + 7;
    const fileNo = `REP-2026-${String(num).padStart(4, '0')}`;
    const cust = customers[i];
    const config = statusConfigs[i % statusConfigs.length];
    const ksm = ksmPresets[i % ksmPresets.length];
    const designerId = config.assignDesigner ? designers[i % designers.length] : null;
    const slotId = config.slotCode ? slotMap[config.slotCode]?.id : null;

    const stageForExtra =
      config.departmentCode === 'ONREPRO' ? Stage.PRE_REPRO
      : config.status === FileStatus.SENT_TO_PRODUCTION ? Stage.DONE
      : Stage.REPRO;
    const f = await prisma.file.upsert({
      where: { fileNo },
      update: { fileTypeId: genelFileType.id, difficultyLevel: 3, difficultyWeight: 1.0, stage: stageForExtra },
      create: {
        fileNo,
        customerName: cust.name,
        customerNo: cust.no,
        ksmData: ksm,
        status: config.status,
        stage: stageForExtra,
        assignedDesignerId: designerId,
        currentDepartmentId: deptMap[config.departmentCode].id,
        currentLocationSlotId: slotId,
        fileTypeId: genelFileType.id,
        difficultyLevel: 2 + (i % 3),
        difficultyWeight: 0.8 + (i % 5) * 0.1,
        priority: config.priority,
        requiresApproval: config.status === FileStatus.CUSTOMER_APPROVAL ? i % 2 === 0 : false,
        closedAt: config.status === FileStatus.SENT_TO_PRODUCTION ? new Date(Date.now() - (i + 1) * 60 * 60 * 1000) : undefined,
      },
    });
    createdFileIds.push(f.id);

    if (config.withTimer && f.id && designerId) {
      await prisma.timer.create({
        data: {
          fileId: f.id,
          departmentId: deptMap[config.departmentCode].id,
          userId: designerId,
          startTime: new Date(Date.now() - (i + 1) * 60 * 60 * 1000),
        },
      });
    }
    if (config.withNote && f.id && designerId) {
      await prisma.note.create({
        data: {
          fileId: f.id,
          userId: designerId,
          departmentId: deptMap[config.departmentCode].id,
          message: `Test notu: ${fileNo} - ${config.status} durumunda.`,
        },
      });
    }
  }

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

  // ========================================
  // Atama bekleyen dosyalar (15 adet)
  // ========================================
  console.log('Creating files awaiting assignment (atama bekleyen)...');

  const awaitingAssignmentCustomers = [
    { name: 'Saueressig Ambalaj', no: 'CUST-041', orderName: 'Sipariş SAU-2026-01' },
    { name: 'Beta Folyo Ltd.', no: 'CUST-042', orderName: 'Yılbaşı etiketleri' },
    { name: 'Delta Matbaa A.Ş.', no: 'CUST-043', orderName: 'Katalog kapak' },
    { name: 'Epsilon Gıda San.', no: 'CUST-044', orderName: 'Çikolata paketi MG2' },
    { name: 'Gamma Kozmetik', no: 'CUST-045', orderName: 'Parfüm kutusu revizyon' },
    { name: 'Omega Tekstil', no: 'CUST-046', orderName: 'Tişört baskı' },
    { name: 'Sigma İlaç', no: 'CUST-047', orderName: 'Prospektüs 2026' },
    { name: 'Theta Otomotiv', no: 'CUST-048', orderName: 'Araç etiket serisi' },
    { name: 'Zeta Medikal', no: 'CUST-049', orderName: 'Steril paket baskı' },
    { name: 'Eta Elektronik', no: 'CUST-050', orderName: 'Kutu üretim baskı' },
    { name: 'Kappa Deri', no: 'CUST-051', orderName: 'Etiket yeni tasarım' },
    { name: 'Lambda Temizlik', no: 'CUST-052', orderName: 'Deterjan etiket' },
    { name: 'Mu Tarım', no: 'CUST-053', orderName: 'Tohum paketi' },
    { name: 'Nu İnşaat', no: 'CUST-054', orderName: 'Ürün kataloğu' },
    { name: 'Xi Perakende', no: 'CUST-055', orderName: 'Promosyon etiket seti' },
  ];

  const awaitingSlots = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'A10'];
  const awaitingKsm = [
    { width: 800, height: 600, colors: ['CMYK'], cylinder: 'C-080' },
    { width: 1000, height: 700, colors: ['Cyan', 'Magenta', 'Yellow', 'Black'], cylinder: 'C-100' },
    { width: 1200, height: 800, colors: ['Pantone 485', 'Black'], cylinder: 'C-120' },
    { width: 600, height: 400, colors: ['Spot Orange', 'Black'], cylinder: 'C-060' },
    { width: 1500, height: 1000, colors: ['CMYK', 'Spot'], cylinder: 'C-150' },
    { width: 900, height: 500, colors: ['CMYK'], cylinder: 'C-090' },
  ];
  const awaitingPriorities = [Priority.NORMAL, Priority.NORMAL, Priority.HIGH, Priority.URGENT, Priority.LOW];

  for (let i = 0; i < 15; i++) {
    const num = 41 + i;
    const fileNo = `REP-2026-${String(num).padStart(4, '0')}`;
    const cust = awaitingAssignmentCustomers[i];
    const slotCode = awaitingSlots[i % awaitingSlots.length];
    const ksm = awaitingKsm[i % awaitingKsm.length];
    const priority = awaitingPriorities[i % awaitingPriorities.length];
    const dueDate = new Date(Date.now() + (3 + (i % 10)) * 24 * 60 * 60 * 1000);

    const f = await prisma.file.upsert({
      where: { fileNo },
      update: {
        fileTypeId: genelFileType.id,
        difficultyLevel: 2 + (i % 3),
        difficultyWeight: 0.8 + (i % 5) * 0.1,
        status: FileStatus.AWAITING_ASSIGNMENT,
        stage: Stage.PRE_REPRO,
        currentDepartmentId: deptMap.ONREPRO.id,
        currentLocationSlotId: slotMap[slotCode].id,
      },
      create: {
        fileNo,
        customerName: cust.name,
        customerNo: cust.no,
        orderName: cust.orderName,
        ksmData: ksm,
        status: FileStatus.AWAITING_ASSIGNMENT,
        stage: Stage.PRE_REPRO,
        currentDepartmentId: deptMap.ONREPRO.id,
        currentLocationSlotId: slotMap[slotCode].id,
        fileTypeId: genelFileType.id,
        difficultyLevel: 2 + (i % 3),
        difficultyWeight: 0.8 + (i % 5) * 0.1,
        priority,
        dueDate,
      },
    });

    await prisma.auditLog.create({
      data: {
        fileId: f.id,
        actionType: 'CREATE',
        toDepartmentId: deptMap.ONREPRO.id,
        byUserId: userMap.onrepro1.id,
        payload: { source: 'seed', note: 'Atama bekleyen dosya' },
      },
    });
  }

  console.log('✅ Created 15 files awaiting assignment (atama bekleyen dosyalar)');

  // ========================================
  // Atama havuzu (Bahar'a devredilmiş – stage=REPRO, assignedDesignerId=Bahar)
  // ========================================
  console.log('Creating Bahar atama havuzu files (stage=REPRO, assignedDesignerId=Bahar)...');
  const baharPoolCustomers = [
    { name: 'Havuz Müşteri 1', no: 'CUST-056' },
    { name: 'Havuz Müşteri 2', no: 'CUST-057' },
    { name: 'Havuz Müşteri 3', no: 'CUST-058' },
  ];
  for (let i = 0; i < 3; i++) {
    const num = 56 + i;
    const fileNo = `REP-2026-${String(num).padStart(4, '0')}`;
    const cust = baharPoolCustomers[i];
    await prisma.file.upsert({
      where: { fileNo },
      update: {
        stage: Stage.REPRO,
        assignedDesignerId: userMap.bahar.id,
        status: FileStatus.ASSIGNED,
        pendingTakeover: true,
        fileTypeId: genelFileType.id,
      },
      create: {
        fileNo,
        customerName: cust.name,
        customerNo: cust.no,
        orderName: `Atama havuzu ${fileNo}`,
        ksmData: { width: 1000, height: 700, colors: ['CMYK'], cylinder: 'C-100' },
        status: FileStatus.ASSIGNED,
        stage: Stage.REPRO,
        assignedDesignerId: userMap.bahar.id,
        pendingTakeover: true,
        currentDepartmentId: deptMap.REPRO.id,
        currentLocationSlotId: slotMap.R1.id,
        fileTypeId: genelFileType.id,
        difficultyLevel: 3,
        difficultyWeight: 1.0,
        priority: Priority.NORMAL,
      },
    });
  }
  console.log('✅ Created 3 files in Bahar atama havuzu (Atama havuzu sayfasında görünür)');
  console.log(`✅ Created 40 sample files (6 detailed + 34 extra) with timers and notes`);

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
