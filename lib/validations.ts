import { z } from 'zod';

// File schemas
export const createFileSchema = z.object({
  fileNo: z
    .string()
    .min(1, 'Dosya no zorunludur')
    .max(50, 'Dosya no en fazla 50 karakter olabilir')
    .regex(/^[A-Z0-9-]+$/i, 'Dosya no sadece harf, rakam ve tire içerebilir'),
  customerName: z
    .string()
    .min(1, 'Müşteri adı zorunludur')
    .max(200, 'Müşteri adı en fazla 200 karakter olabilir')
    .transform((val) => val.trim()),
  customerNo: z.string().max(50).optional().nullable(),
  ksmData: z.record(z.any()).optional().nullable(),
  locationSlotId: z.string().uuid('Geçersiz konum ID'),
  requiresApproval: z.boolean().default(true),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
});

export const updateFileSchema = z.object({
  customerName: z.string().min(1).max(200).optional(),
  customerNo: z.string().max(50).optional().nullable(),
  ksmData: z.record(z.any()).optional().nullable(),
  locationSlotId: z.string().uuid().optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
  requiresApproval: z.boolean().optional(),
});

// Action schemas
export const assignFileSchema = z.object({
  designerId: z.string().uuid('Geçersiz tasarımcı ID'),
  note: z.string().max(1000).optional(),
});

export const takeoverSchema = z.object({
  locationSlotId: z.string().uuid().optional(),
  note: z.string().max(1000).optional(),
});

export const transferSchema = z.object({
  toDepartmentId: z.string().uuid('Geçersiz departman ID'),
  locationSlotId: z.string().uuid().optional(),
  note: z.string().max(1000).optional(),
});

export const noteSchema = z.object({
  message: z
    .string()
    .min(1, 'Not içeriği zorunludur')
    .max(5000, 'Not en fazla 5000 karakter olabilir'),
});

export const nokNoteSchema = z.object({
  note: z
    .string()
    .min(10, 'Red notu en az 10 karakter olmalıdır')
    .max(5000, 'Not en fazla 5000 karakter olabilir'),
});

export const restartMgSchema = z.object({
  note: z
    .string()
    .min(1, 'Not zorunludur')
    .max(5000, 'Not en fazla 5000 karakter olabilir'),
});

export const simpleActionSchema = z.object({
  note: z.string().max(1000).optional(),
});

// User schemas
export const createUserSchema = z.object({
  username: z
    .string()
    .min(3, 'Kullanıcı adı en az 3 karakter olmalıdır')
    .max(50, 'Kullanıcı adı en fazla 50 karakter olabilir')
    .regex(/^[a-zA-Z0-9_]+$/, 'Kullanıcı adı sadece harf, rakam ve alt çizgi içerebilir'),
  password: z.string().min(8, 'Şifre en az 8 karakter olmalıdır'),
  fullName: z
    .string()
    .min(2, 'Ad soyad en az 2 karakter olmalıdır')
    .max(100, 'Ad soyad en fazla 100 karakter olabilir'),
  email: z.string().email('Geçersiz e-posta adresi').optional().nullable(),
  role: z.enum(['ADMIN', 'ONREPRO', 'GRAFIKER', 'KALITE', 'KOLAJ']),
  departmentId: z.string().uuid('Geçersiz departman ID'),
});

export const updateUserSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  email: z.string().email().optional().nullable(),
  role: z.enum(['ADMIN', 'ONREPRO', 'GRAFIKER', 'KALITE', 'KOLAJ']).optional(),
  departmentId: z.string().uuid().optional(),
  password: z.string().min(8).optional(),
});

// Login schema
export const loginSchema = z.object({
  username: z.string().min(1, 'Kullanıcı adı zorunludur'),
  password: z.string().min(1, 'Şifre zorunludur'),
});

// Location schemas
export const createLocationSchema = z.object({
  code: z
    .string()
    .min(1, 'Kod zorunludur')
    .max(20, 'Kod en fazla 20 karakter olabilir')
    .regex(/^[A-Z0-9]+$/i, 'Kod sadece harf ve rakam içerebilir'),
  name: z.string().min(1, 'İsim zorunludur').max(100),
  area: z.enum(['WAITING', 'REPRO', 'QUALITY', 'KOLAJ', 'ARCHIVE']),
  row: z.number().int().min(1),
  column: z.number().int().min(1),
});

// Query schemas
export const fileQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().optional(),
  departmentId: z.string().uuid().optional(),
  assignedDesignerId: z.string().uuid().optional(),
  search: z.string().optional(),
  pendingTakeover: z.coerce.boolean().optional(),
  priority: z.string().optional(),
  sortBy: z.string().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Type exports
export type CreateFileInput = z.infer<typeof createFileSchema>;
export type UpdateFileInput = z.infer<typeof updateFileSchema>;
export type AssignFileInput = z.infer<typeof assignFileSchema>;
export type TakeoverInput = z.infer<typeof takeoverSchema>;
export type TransferInput = z.infer<typeof transferSchema>;
export type NoteInput = z.infer<typeof noteSchema>;
export type NokNoteInput = z.infer<typeof nokNoteSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type FileQueryInput = z.infer<typeof fileQuerySchema>;
