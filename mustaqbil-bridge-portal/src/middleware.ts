import { NextResponse, type NextRequest } from 'next/server';

const PROTECTED_PREFIXES = ['/tasks', '/team'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    const authCookie = request.cookies.get('sb-access-token');

    if (!authCookie) {
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/tasks/:path*', '/team/:path*'],
};
