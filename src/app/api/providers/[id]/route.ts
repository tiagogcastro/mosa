import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { providers } from '@/db/schema';
import { refreshProvider, inspectConnection } from '@/features/providers/service';
import { encrypt, decrypt } from '@/lib/security/crypto';
import type { StoredConnection } from '@/features/providers/service';
import { z } from 'zod';
import { failure, protectMutation } from '@/lib/security/request';
import { clearSourceHealth } from '@/features/providers/health';
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
  clearSourceHealth(id);
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
    const edit = z
      .object({
        action: z.literal('edit'),
        name: z.string().trim().min(1).max(80),
        server: z.url().optional(),
        username: z.string().min(1).optional(),
        password: z.string().min(1).optional(),
        liveFormat: z.enum(['auto', 'm3u8', 'ts']).nullable().optional(),
        url: z.url().optional(),
        mac: z
          .string()
          .regex(/^([0-9a-f]{2}:){5}[0-9a-f]{2}$/i)
          .optional(),
      })
      .safeParse(body);
    if (edit.success) {
      const provider = db.select().from(providers).where(eq(providers.id, id)).get();
      if (!provider || provider.type === 'demo') {
        return NextResponse.json({ error: 'PROVIDER_NOT_FOUND' }, { status: 404 });
      }
      const stored = decrypt<StoredConnection | { type: 'm3u'; local: true }>(
        provider.encryptedConfig,
      );
      if (
        'local' in stored &&
        (edit.data.server ||
          edit.data.url ||
          edit.data.username ||
          edit.data.password ||
          edit.data.mac)
      ) {
        return NextResponse.json({ error: 'LOCAL_FILE_REQUIRED' }, { status: 400 });
      }
      const updated =
        'local' in stored
          ? stored
          : stored.type === 'xtream'
            ? {
                ...stored,
                server: edit.data.server ?? stored.server,
                username: edit.data.username ?? stored.username,
                password: edit.data.password ?? stored.password,
                liveFormat:
                  edit.data.liveFormat === null
                    ? undefined
                    : (edit.data.liveFormat ?? stored.liveFormat),
                name: edit.data.name,
              }
            : stored.type === 'stalker'
              ? {
                  ...stored,
                  server: edit.data.server ?? stored.server,
                  mac: edit.data.mac ?? stored.mac,
                  name: edit.data.name,
                }
              : { ...stored, url: edit.data.url ?? stored.url, name: edit.data.name };
      if (
        !('local' in updated) &&
        (edit.data.server ||
          edit.data.url ||
          edit.data.username ||
          edit.data.password ||
          edit.data.mac)
      ) {
        await inspectConnection(updated);
      }
      db.update(providers)
        .set({ name: edit.data.name, encryptedConfig: encrypt(updated) })
        .where(eq(providers.id, id))
        .run();
      clearSourceHealth(id);
      return NextResponse.json({ ok: true });
    }
    if (
      typeof body === 'object' &&
      body !== null &&
      'enabled' in body &&
      typeof body.enabled === 'boolean'
    ) {
      db.update(providers).set({ enabled: body.enabled }).where(eq(providers.id, id)).run();
      clearSourceHealth(id);
      return NextResponse.json({ ok: true });
    }
    const result = await refreshProvider(id);
    if (!result.success) {
      return NextResponse.json({ success: false, error: { code: result.error } }, { status: 400 });
    }
    clearSourceHealth(id);

    return NextResponse.json(result.data);
  } catch (error) {
    return failure(error);
  }
}
