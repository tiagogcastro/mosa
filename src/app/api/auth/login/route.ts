import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { issueSession, verifyOwnerPassword } from '@/features/auth/service';
import { protectMutation } from '@/lib/security/request';
export const runtime = 'nodejs';
export async function POST(request: NextRequest) {
  const denied = protectMutation(request);
  if (denied) {
    return denied;
  }
  try {
    const { password } = z
      .object({ password: z.string().min(1).max(512) })
      .parse(await request.json());
    if (!verifyOwnerPassword(password)) {
      return NextResponse.json(
        { error: 'INVALID_CREDENTIALS' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } },
      );
    }
    return issueSession(
      NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } }),
      request,
      'owner',
    );
  } catch {
    return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
  }
}
