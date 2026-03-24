import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isAuthPage = req.nextUrl.pathname.startsWith('/login') ||
                     req.nextUrl.pathname.startsWith('/register');
  const isApiAuthRoute = req.nextUrl.pathname.startsWith('/api/auth');
  const isProtectedApiRoute = req.nextUrl.pathname.startsWith('/api/') && !isApiAuthRoute;

  // Allow auth pages and auth API routes
  if (isAuthPage || isApiAuthRoute) {
    if (isLoggedIn && isAuthPage) {
      return NextResponse.redirect(new URL('/', req.url));
    }
    return NextResponse.next();
  }

  // Protect API routes
  if (isProtectedApiRoute && !isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Protect chat pages
  if (req.nextUrl.pathname === '/' || req.nextUrl.pathname.startsWith('/chat')) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
};
