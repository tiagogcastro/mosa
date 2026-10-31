import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { providers } from '@/db/schema';
import { authEnabled, roleForRequest } from '@/features/auth/service';
import { decrypt } from '@/lib/security/crypto';
import type { XtreamConfig } from '@/features/providers/adapters/xtream';

export const runtime = 'nodejs';
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (authEnabled() && roleForRequest(request) !== 'owner') {
    return NextResponse.json({ error: 'OWNER_ONLY' }, { status: 403 });
  }
  const { id } = await params;
  const provider = db.select().from(providers).where(eq(providers.id, id)).get();
  if (!provider || provider.type !== 'xtream') {
    return NextResponse.json({ error: 'PROVIDER_NOT_FOUND' }, { status: 404 });
  }
  const { password } = decrypt<XtreamConfig>(provider.encryptedConfig);
  return NextResponse.json(
    { password },
    { headers: { 'Cache-Control': 'private, no-store', Pragma: 'no-cache' } },
  );
}
