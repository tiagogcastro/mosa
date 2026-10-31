import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from '@/i18n/routing';
import { authConfigured, authEnabled, publicOrigin, roleForRequest } from '@/features/auth/service';

const localizedMiddleware = createMiddleware(routing);

export default function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const host = request.headers.get('host') || '';
  const loopback = /^(?:127\.0\.0\.1|localhost|\[::1\])(?::\d+)?$/.test(host);
  const origin = publicOrigin();
  const publicHost = origin && host === new URL(origin).host;
  const https =
    request.nextUrl.protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https';
  if (!authConfigured() || (!loopback && !(authEnabled() && publicHost && https))) {
    return NextResponse.json({ error: 'Protected server configuration required' }, { status: 403 });
  }
  if (authEnabled()) {
    const guestPage = /^\/(?:pt-BR|en|es)\/(?:login|pair|provide)(?:\/|$)/.test(pathname);
    const guestApi =
      /^\/api\/auth\/(?:login|redeem)(?:\/|$)/.test(pathname) ||
      pathname === '/api/provision/submit';
    if (!guestPage && !guestApi) {
      const role = roleForRequest(request);
      if (!role) {
        if (pathname.startsWith('/api/')) {
          return NextResponse.json(
            { error: 'UNAUTHORIZED' },
            { status: 401, headers: { 'Cache-Control': 'no-store' } },
          );
        }
        const destination = request.nextUrl.clone();
        destination.pathname = '/pt-BR/login';
        destination.search = '';
        return NextResponse.redirect(destination);
      }
      if (
        role === 'viewer' &&
        ((request.method !== 'GET' &&
          request.method !== 'HEAD' &&
          !(pathname === '/api/auth/logout' && request.method === 'POST')) ||
          /^\/api\/(?:providers|preferences|auth\/sessions)/.test(pathname) ||
          /^\/(?:pt-BR|en|es)\/(?:settings|connect)(?:\/|$)/.test(pathname))
      ) {
        return NextResponse.json({ error: 'OWNER_ONLY' }, { status: 403 });
      }
    }
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  if (/^\/(en|es)(\/|$)/.test(pathname)) {
    return localizedMiddleware(request);
  }

  if (/^\/pt-BR(\/|$)/.test(pathname)) {
    return NextResponse.next();
  }

  const destination = request.nextUrl.clone();
  destination.pathname = `/pt-BR${pathname === '/' ? '' : pathname}`;
  return NextResponse.rewrite(destination);
}

export const config = { matcher: '/((?!_next/|brand/|icons/|favicon.ico|manifest.webmanifest).*)' };
