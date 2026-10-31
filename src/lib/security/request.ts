import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { authEnabled, publicOrigin } from '@/features/auth/service';

export function protectMutation(request: NextRequest) {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  const address = request.headers.get('x-forwarded-for');
  if (address && !/^(127\.0\.0\.1|::1)(,|$)/.test(address) && !(authEnabled() && publicOrigin())) {
    return NextResponse.json({ error: 'Local access only' }, { status: 403 });
  }
  if (authEnabled() && !origin) {
    return NextResponse.json({ error: 'Missing origin' }, { status: 403 });
  }
  if (
    origin &&
    (!host ||
      new URL(origin).host !== host ||
      (publicOrigin() && host === new URL(publicOrigin()!).host && origin !== publicOrigin()))
  ) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  }
  return null;
}
export function failure(error: unknown) {
  const code = error instanceof ZodError ? 'INVALID_INPUT' : 'OPERATION_FAILED';

  return NextResponse.json({ success: false, error: { code } }, { status: 400 });
}
