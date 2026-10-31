import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authEnabled, publicOrigin } from '@/features/auth/service';
import {
  provisionConnection,
  provisioningRateAllowed,
  submitProvisioning,
} from '@/features/providers/provisioning';

export const runtime = 'nodejs';
const schema = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  connection: provisionConnection,
});

async function readLimited(request: NextRequest) {
  const reader = request.body?.getReader();
  if (!reader) {
    throw new Error('No body');
  }
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    size += value.byteLength;
    if (size > 8192) {
      await reader.cancel();
      throw new Error('Payload too large');
    }
    chunks.push(value);
  }
  return JSON.parse(new TextDecoder().decode(Buffer.concat(chunks))) as unknown;
}

export async function POST(request: NextRequest) {
  const origin = publicOrigin();
  if (
    !authEnabled() ||
    !origin ||
    request.headers.get('origin') !== origin ||
    request.headers.get('host') !== new URL(origin).host ||
    !(request.nextUrl.protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https')
  ) {
    return NextResponse.json({ error: 'HTTPS_REQUIRED' }, { status: 403 });
  }
  const address =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';
  if (!provisioningRateAllowed(address)) {
    return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429 });
  }
  try {
    const { token, connection } = schema.parse(await readLimited(request));
    return submitProvisioning(token, connection)
      ? NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
      : NextResponse.json({ error: 'EXPIRED_OR_USED' }, { status: 410 });
  } catch {
    return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
  }
}
