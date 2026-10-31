import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db/client';
import { providers } from '@/db/schema';
import { authEnabled, roleForRequest } from '@/features/auth/service';
import { inspectConnection, type StoredConnection } from '@/features/providers/service';
import { decrypt } from '@/lib/security/crypto';
import { failure, protectMutation } from '@/lib/security/request';

export const runtime = 'nodejs';
const edit = z.object({
  name: z.string().min(1).max(80),
  server: z.url().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  url: z.url().optional(),
  liveFormat: z.enum(['auto', 'm3u8', 'ts']).nullable().optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = protectMutation(request);
  if (denied || (authEnabled() && roleForRequest(request) !== 'owner')) {
    return denied ?? NextResponse.json({ error: 'OWNER_ONLY' }, { status: 403 });
  }
  try {
    const { id } = await params;
    const provider = db.select().from(providers).where(eq(providers.id, id)).get();
    if (!provider || !['xtream', 'm3u'].includes(provider.type)) {
      return NextResponse.json({ error: 'PROVIDER_NOT_FOUND' }, { status: 404 });
    }
    const stored = decrypt<StoredConnection | { local: true }>(provider.encryptedConfig);
    if ('local' in stored) {
      return NextResponse.json({ error: { code: 'LOCAL_FILE_REQUIRED' } }, { status: 400 });
    }
    if (stored.type !== 'xtream' && stored.type !== 'm3u') {
      return NextResponse.json({ error: 'PROVIDER_NOT_FOUND' }, { status: 404 });
    }
    const input = edit.parse(await request.json());
    const config =
      stored.type === 'xtream'
        ? {
            ...stored,
            name: input.name,
            server: input.server ?? stored.server,
            username: input.username ?? stored.username,
            password: input.password || stored.password,
            liveFormat:
              input.liveFormat === null ? undefined : (input.liveFormat ?? stored.liveFormat),
          }
        : { ...stored, name: input.name, url: input.url ?? stored.url };
    return NextResponse.json(await inspectConnection(config));
  } catch (error) {
    return failure(error);
  }
}
