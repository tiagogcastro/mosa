import { NextRequest, NextResponse } from 'next/server';
import { revokeViewer, roleForRequest, viewerSessions } from '@/features/auth/service';
import { protectMutation } from '@/lib/security/request';
export const runtime = 'nodejs';
export function GET(request: NextRequest) {
  if (roleForRequest(request) !== 'owner') {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 403 });
  }
  return NextResponse.json(
    { sessions: viewerSessions() },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
export async function DELETE(request: NextRequest) {
  const denied = protectMutation(request);
  if (denied) {
    return denied;
  }
  if (roleForRequest(request) !== 'owner') {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 403 });
  }
  const body: unknown = await request.json().catch(() => null);
  if (
    !body ||
    typeof body !== 'object' ||
    !('id' in body) ||
    typeof body.id !== 'string' ||
    !/^[a-f0-9]{64}$/.test(body.id)
  ) {
    return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
  }
  return NextResponse.json({ revoked: revokeViewer(body.id) });
}
