import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { providers } from '@/db/schema';
import { installDemo } from '@/features/providers/demo';
import { failure, protectMutation } from '@/lib/security/request';
import { clearSourceHealth } from '@/features/providers/health';
export const runtime = 'nodejs';
export function POST(request: NextRequest) {
  const denied = protectMutation(request);
  if (denied) {
    return denied;
  }
  try {
    installDemo();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}

export function PATCH(request: NextRequest) {
  const denied = protectMutation(request);
  if (denied) {
    return denied;
  }
  return request
    .json()
    .then((body: unknown) => {
      if (!body || typeof body !== 'object') {
        return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
      }
      if ('enabled' in body && typeof body.enabled === 'boolean') {
        db.update(providers).set({ enabled: body.enabled }).where(eq(providers.id, 'demo')).run();
        clearSourceHealth('demo');
        return NextResponse.json({ ok: true });
      }
      if (
        'action' in body &&
        body.action === 'edit' &&
        'name' in body &&
        typeof body.name === 'string' &&
        body.name.trim().length > 0 &&
        body.name.length <= 80
      ) {
        db.update(providers).set({ name: body.name.trim() }).where(eq(providers.id, 'demo')).run();
        clearSourceHealth('demo');
        return NextResponse.json({ ok: true });
      }
      return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
    })
    .catch(failure);
}

export function DELETE(request: NextRequest) {
  const denied = protectMutation(request);
  if (denied) {
    return denied;
  }
  db.delete(providers).where(eq(providers.id, 'demo')).run();
  clearSourceHealth('demo');
  return NextResponse.json({ ok: true });
}
