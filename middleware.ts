import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // Admin routes check
    const adminRoutes = ['/dashboard/admin', '/dashboard/reports', '/dashboard/assignments'];
    const isAdminRoute = adminRoutes.some((route) => pathname.startsWith(route));

    if (isAdminRoute && token?.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // Allow login page (no auth required)
        if (pathname.startsWith('/login')) {
          return true;
        }

        // Allow NextAuth API routes (session, signin, callback, etc.)
        if (pathname.startsWith('/api/auth')) {
          return true;
        }

        // Require auth for dashboard
        if (pathname.startsWith('/dashboard')) {
          return !!token;
        }

        // Other API routes require auth
        if (pathname.startsWith('/api/')) {
          return !!token;
        }

        return true;
      },
    },
    pages: {
      signIn: '/login',
    },
  }
);

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
};
