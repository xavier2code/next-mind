import { auth } from '@/auth';
import { NextResponse } from 'next/server';

/**
 * Authentication middleware for route protection
 *
 * Security notes:
 * - MCP endpoints (/api/mcp/*) are protected by auth and designed for localhost-only access
 * - DNS rebinding protection is enforced at the MCP route level via Origin header validation
 * - This ensures external websites cannot make requests to local MCP tools
 */
export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isAuthPage = req.nextUrl.pathname.startsWith('/login') ||
                     req.nextUrl.pathname.startsWith('/register');
  const isApiAuthRoute = req.nextUrl.pathname.startsWith('/api/auth');
  const isHealthRoute = req.nextUrl.pathname === '/api/health';
  const isMcpRoute = req.nextUrl.pathname.startsWith('/api/mcp');
  const isProtectedApiRoute = req.nextUrl.pathname.startsWith('/api/') && !isApiAuthRoute;

  // Allow health endpoint, auth pages, and auth API routes
  if (isHealthRoute || isAuthPage || isApiAuthRoute) {
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
  if (req.nextUrl.pathname === '/' || req.nextUrl.pathname.startsWith('/chat') || req.nextUrl.pathname.startsWith('/files')) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
};
