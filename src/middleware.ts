import { NextRequest, NextResponse } from 'next/server';

const PROTECTED_PATHS = ['/dashboard', '/trips', '/profile', '/saved-places', '/favorites', '/notifications'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  // Check JWT in cookie (set by authStore.setAuth)
  const token =
    request.cookies.get('jwt_token')?.value ||
    request.headers.get('authorization')?.replace('Bearer ', '');

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/trips/:path*',
    '/profile/:path*',
    '/saved-places/:path*',
    '/favorites/:path*',
    '/notifications/:path*',
  ],
};
