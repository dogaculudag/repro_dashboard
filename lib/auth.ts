import { NextAuthOptions, getServerSession } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from './db';
import { loginSchema } from './validations';
import type { Role } from '@prisma/client';

// Extend types
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      username: string;
      fullName: string;
      email?: string | null;
      role: Role;
      departmentId: string;
      departmentCode: string;
    };
  }

  interface User {
    id: string;
    username: string;
    fullName: string;
    email?: string | null;
    role: Role;
    departmentId: string;
    departmentCode: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    username: string;
    fullName: string;
    role: Role;
    departmentId: string;
    departmentCode: string;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          const parsed = loginSchema.safeParse(credentials);
          if (!parsed.success) {
            return null;
          }

          const { username, password } = parsed.data;

          const user = await prisma.user.findUnique({
            where: { username },
            include: { department: true },
          });

          if (!user || !user.isActive) {
            return null;
          }

          const isValidPassword = await bcrypt.compare(password, user.passwordHash);
          if (!isValidPassword) {
            return null;
          }

          return {
            id: user.id,
            username: user.username,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            departmentId: user.departmentId,
            departmentCode: user.department.code,
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 hours
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.fullName = user.fullName;
        token.role = user.role;
        token.departmentId = user.departmentId;
        token.departmentCode = user.departmentCode;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.username = token.username;
        session.user.fullName = token.fullName;
        session.user.role = token.role;
        session.user.departmentId = token.departmentId;
        session.user.departmentCode = token.departmentCode;
      }
      return session;
    },
  },
};

// Helper to get session in server components
export async function auth() {
  return await getServerSession(authOptions);
}

// Helper to require authentication
export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }
  return session.user;
}
