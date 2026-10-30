import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from '@/i18n/routing';

const localizedMiddleware = createMiddleware(routing);

export default function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

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

export const config = { matcher: '/((?!api|_next|.*\\..*).*)' };
