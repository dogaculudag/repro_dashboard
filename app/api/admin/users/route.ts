import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { adminCreateUserSchema } from '@/lib/validations';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Giriş yapmanız gerekiyor' } },
      { status: 401 }
    );
  }
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'Yetkiniz yok' } },
      { status: 403 }
    );
  }

  try {
    const users = await prisma.user.findMany({
      where: {},
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        department: {
          select: { id: true, name: true, code: true },
        },
      },
      orderBy: { fullName: 'asc' },
    });

    return NextResponse.json({ success: true, data: users });
  } catch (error: unknown) {
    console.error('GET /api/admin/users error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: (error as Error).message } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Giriş yapmanız gerekiyor' } },
      { status: 401 }
    );
  }
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'Yetkiniz yok' } },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const parsed = adminCreateUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Geçersiz veri', details: parsed.error.flatten().fieldErrors } },
        { status: 422 }
      );
    }

    const data = parsed.data;

    // Username unique check
    const existingByUsername = await prisma.user.findUnique({
      where: { username: data.username },
    });
    if (existingByUsername) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Bu kullanıcı adı zaten mevcut' } },
        { status: 422 }
      );
    }

    // Email unique check (if provided)
    if (data.email) {
      const existingByEmail = await prisma.user.findUnique({
        where: { email: data.email },
      });
      if (existingByEmail) {
        return NextResponse.json(
          { success: false, error: { code: 'VALIDATION_ERROR', message: 'Bu e-posta adresi zaten mevcut' } },
          { status: 422 }
        );
      }
    }

    const plainPassword = data.password || crypto.randomBytes(8).toString('hex');
    const passwordHash = await bcrypt.hash(plainPassword, 10);

    const user = await prisma.user.create({
      data: {
        username: data.username,
        passwordHash,
        fullName: data.fullName,
        email: data.email,
        role: data.role,
        departmentId: data.departmentId,
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
        department: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    return NextResponse.json(
      { success: true, data: { user, generatedPassword: data.password ? undefined : plainPassword } },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('POST /api/admin/users error:', error);

    if ((error as { code?: string }).code === 'P2002') {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Bu kullanıcı adı veya e-posta zaten mevcut' } },
        { status: 422 }
      );
    }

    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: (error as Error).message } },
      { status: 500 }
    );
  }
}
