import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authEnabled, roleForRequest } from '@/features/auth/service';
import { createProvisioning, pendingProvisioning } from '@/features/providers/provisioning';
import { failure, protectMutation } from '@/lib/security/request';

export const runtime = 'nodejs';
function authorized(request: NextRequest) {
  return !authEnabled() || roleForRequest(request) === 'owner';
}

export function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'OWNER_ONLY' }, { status: 403 });
  }
  return NextResponse.json(
    { requests: pendingProvisioning() },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}

export async function POST(request: NextRequest) {
  const denied = protectMutation(request);
  if (denied || !authorized(request)) {
    return denied ?? NextResponse.json({ error: 'OWNER_ONLY' }, { status: 403 });
  }
  try {
    const { locale } = z
      .object({ locale: z.enum(['pt-BR', 'en', 'es']) })
      .parse(await request.json());
    const result = createProvisioning(locale);
    return result
      ? NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } })
      : NextResponse.json({ error: 'HTTPS_REQUIRED' }, { status: 400 });
  } catch (error) {
    return failure(error);
  }
}
