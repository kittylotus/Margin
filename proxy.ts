import { NextRequest, NextResponse } from 'next/server';
import { ACCESS_COOKIE, accessRequired, validAccessSession } from '@/lib/access';

const PUBLIC_PREFIXES = ['/_next/', '/icons/', '/api/access/'];
const PUBLIC_PATHS = new Set(['/access', '/favicon.svg', '/manifest.webmanifest', '/sw.js']);

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.has(pathname) || PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function proxy(request: NextRequest) {
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const effectiveHost = forwardedHost || request.headers.get('host') || request.nextUrl.host;
  let hostname = request.nextUrl.hostname.toLowerCase();
  try { hostname = new URL(`http://${effectiveHost}`).hostname.toLowerCase(); } catch {}
  const loopback = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]';
  if (!accessRequired() || loopback || isPublicPath(request.nextUrl.pathname)) return NextResponse.next();

  const cookie = request.cookies.get(ACCESS_COOKIE)?.value;
  if (await validAccessSession(cookie)) return NextResponse.next();

  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Margin is locked. Authenticate this device first.' }, { status: 401 });
  }

  const login = request.nextUrl.clone();
  login.pathname = '/access';
  login.search = '';
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
