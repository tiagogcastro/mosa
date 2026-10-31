import { NextRequest, NextResponse } from 'next/server';
import { createInvite, roleForRequest, publicOrigin } from '@/features/auth/service';
import { protectMutation } from '@/lib/security/request';
export const runtime = 'nodejs';
export async function POST(request: NextRequest) {
  const denied = protectMutation(request);
  if (denied) {
    return denied;
  }
  if (roleForRequest(request) !== 'owner') {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 403 });
  }
  if (!publicOrigin()) {
    return NextResponse.json({ error: 'PUBLIC_HTTPS_REQUIRED' }, { status: 400 });
  }
  const body: unknown = await request.json().catch(() => ({}));
  const locale =
    body && typeof body === 'object' && 'locale' in body && typeof body.locale === 'string'
      ? body.locale
      : 'pt-BR';
  const invitation = createInvite(locale);
  return NextResponse.json(invitation, {
    headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' },
  });
}
