import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { providers } from '@/db/schema';
import { refreshProvider } from '@/features/providers/service';
import { failure, protectMutation } from '@/lib/security/request';
export const runtime = 'nodejs';
export async function DELETE(
  request: NextRequest,
  { params }: RouteContext<'/api/providers/[id]'>,
) {
  const denied = protectMutation(request);
  if (denied) {
    return denied;
  }
  const { id } = await params;
  db.delete(providers).where(eq(providers.id, id)).run();
  return NextResponse.json({ ok: true });
}
export async function PATCH(request: NextRequest, { params }: RouteContext<'/api/providers/[id]'>) {
  const denied = protectMutation(request);
  if (denied) {
    return denied;
  }
  try {
    const { id } = await params;
    const body: unknown = await request.json();
    if (
      typeof body === 'object' &&
      body !== null &&
      'enabled' in body &&
      typeof body.enabled === 'boolean'
    ) {
      db.update(providers).set({ enabled: body.enabled }).where(eq(providers.id, id)).run();
      return NextResponse.json({ ok: true });
    }
    const result = await refreshProvider(id);
    if (!result.success) {
      return NextResponse.json({ success: false, error: { code: result.error } }, { status: 400 });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    return failure(error);
  }
}
