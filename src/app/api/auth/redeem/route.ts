import { NextRequest, NextResponse } from 'next/server';
import { issueSession, publicOrigin, redeemInvite } from '@/features/auth/service';
import { protectMutation } from '@/lib/security/request';
export const runtime = 'nodejs';
export async function POST(request: NextRequest) {
  const denied = protectMutation(request);
  if (denied) {
    return denied;
  }
  const origin = publicOrigin();
  if (
    !origin ||
    request.headers.get('origin') !== origin ||
    (request.nextUrl.protocol !== 'https:' && request.headers.get('x-forwarded-proto') !== 'https')
  ) {
    return NextResponse.json({ error: 'HTTPS_REQUIRED' }, { status: 403 });
  }
  try {
    const body: unknown = await request.json();
    if (
      !body ||
      typeof body !== 'object' ||
      !('token' in body) ||
      typeof body.token !== 'string' ||
      !redeemInvite(body.token)
    ) {
      return NextResponse.json(
        { error: 'INVALID_OR_EXPIRED_INVITE' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      );
    }
    return issueSession(
      NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } }),
      request,
      'viewer',
    );
  } catch {
    return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
  }
}
