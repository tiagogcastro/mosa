import { NextRequest, NextResponse } from 'next/server';
import { revokeSession, cookieName } from '@/features/auth/service';
import { protectMutation } from '@/lib/security/request';
export const runtime = 'nodejs';
export function POST(request: NextRequest) {
  const denied = protectMutation(request);
  if (denied) {
    return denied;
  }
  revokeSession(request);
  const response = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  response.cookies.delete(cookieName);
  return response;
}
