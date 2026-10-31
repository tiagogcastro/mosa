import { NextRequest, NextResponse } from 'next/server';
import { authEnabled, roleForRequest } from '@/features/auth/service';
import { checkActiveSource } from '@/features/providers/health';
import { protectMutation } from '@/lib/security/request';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const denied = protectMutation(request);
  if (denied || (authEnabled() && roleForRequest(request) !== 'owner')) {
    return denied ?? NextResponse.json({ error: 'OWNER_ONLY' }, { status: 403 });
  }
  const health = await checkActiveSource();
  return health
    ? NextResponse.json(health, { headers: { 'Cache-Control': 'private, no-store' } })
    : NextResponse.json({ error: 'SOURCE_UNAVAILABLE' }, { status: 404 });
}
