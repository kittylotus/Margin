import { NextRequest, NextResponse } from 'next/server';
import {
  ACCESS_COOKIE,
  ACCESS_MAX_AGE_SECONDS,
  accessRequired,
  configuredAccessCode,
  sessionValueForCode,
  verifyAccessCode,
} from '@/lib/access';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if (!accessRequired()) return NextResponse.json({ ok: true, required: false });
  if (!configuredAccessCode()) {
    return NextResponse.json({ error: 'Margin access protection is enabled but no access code is configured.' }, { status: 503 });
  }

  const origin = request.headers.get('origin');
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const expectedHost = forwardedHost || request.headers.get('host');
  if (origin && expectedHost && new URL(origin).host !== expectedHost) {
    return NextResponse.json({ error: 'Request origin is not allowed.' }, { status: 403 });
  }

  let code = '';
  try {
    const body = await request.json() as { code?: unknown };
    code = typeof body.code === 'string' ? body.code : '';
  } catch {
    return NextResponse.json({ error: 'Enter the Margin access code.' }, { status: 400 });
  }

  if (!(await verifyAccessCode(code))) {
    return NextResponse.json({ error: 'That access code is not valid.' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true, required: true });
  response.cookies.set({
    name: ACCESS_COOKIE,
    value: await sessionValueForCode(configuredAccessCode()),
    httpOnly: true,
    sameSite: 'lax',
    secure: request.nextUrl.protocol === 'https:' || request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() === 'https',
    path: '/',
    maxAge: ACCESS_MAX_AGE_SECONDS,
  });
  return response;
}
