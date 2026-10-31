import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { providers } from '@/db/schema';
import { roleForRequest, authEnabled } from '@/features/auth/service';
import { decrypt } from '@/lib/security/crypto';
import type { XtreamConfig } from '@/features/providers/adapters/xtream';
export const runtime = 'nodejs';
export function GET(request: NextRequest) {
  if (authEnabled() && roleForRequest(request) !== 'owner') {
    return NextResponse.json({ error: 'OWNER_ONLY' }, { status: 403 });
  }
  return NextResponse.json(
    {
      servers: db
        .select()
        .from(providers)
        .where(eq(providers.type, 'xtream'))
        .all()
        .map((provider) => ({
          id: provider.id,
          name: provider.name,
          server: decrypt<XtreamConfig>(provider.encryptedConfig).server,
        })),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
