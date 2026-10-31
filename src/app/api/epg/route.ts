import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { media, providers } from '@/db/schema';
import { activeProviderId } from '@/features/providers/active';
import { xtreamEpg, type XtreamConfig } from '@/features/providers/adapters/xtream';
import { decrypt } from '@/lib/security/crypto';
import { visibleMediaCondition } from '@/features/catalog/restrictions';

export const runtime = 'nodejs';
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (!id || id.length > 250) {
    return NextResponse.json({ programs: [] });
  }
  const row = db
    .select({ externalId: media.externalId, config: providers.encryptedConfig })
    .from(media)
    .innerJoin(providers, eq(providers.id, media.providerId))
    .where(
      and(
        eq(media.id, id),
        eq(media.type, 'live'),
        eq(providers.type, 'xtream'),
        eq(providers.id, activeProviderId() ?? ''),
        visibleMediaCondition(),
      ),
    )
    .get();
  if (!row) {
    return NextResponse.json({ programs: [] }, { headers: { 'Cache-Control': 'no-store' } });
  }
  try {
    return NextResponse.json(
      { programs: await xtreamEpg(decrypt<XtreamConfig>(row.config), row.externalId) },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return NextResponse.json({ programs: [] }, { headers: { 'Cache-Control': 'no-store' } });
  }
}
