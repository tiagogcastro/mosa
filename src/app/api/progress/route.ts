import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db/client';
import { media, progress } from '@/db/schema';
import { failure, protectMutation } from '@/lib/security/request';
import { activeProviderId } from '@/features/providers/active';
import { mediaIsVisible } from '@/features/catalog/restrictions';
import { and, eq, sql } from 'drizzle-orm';
export const runtime = 'nodejs';
const schema = z.object({
  mediaId: z.string().min(1),
  position: z.number().finite().min(0),
  duration: z.number().finite().min(0),
  completed: z.boolean(),
});
export async function POST(request: NextRequest) {
  const denied = protectMutation(request);
  if (denied) {
    return denied;
  }
  try {
    const value = schema.parse(await request.json());
    if (
      !mediaIsVisible(value.mediaId) ||
      !db
        .select({ id: media.id })
        .from(media)
        .where(and(eq(media.id, value.mediaId), eq(media.providerId, activeProviderId() ?? '')))
        .get()
    ) {
      return NextResponse.json({ error: 'MEDIA_UNAVAILABLE' }, { status: 404 });
    }
    db.insert(progress)
      .values({
        ...value,
        position: Math.round(value.position),
        duration: Math.round(value.duration),
        watchedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: progress.mediaId,
        set: {
          ...value,
          position: Math.round(value.position),
          duration: Math.round(value.duration),
          watchedAt: new Date(),
        },
      })
      .run();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
export async function DELETE(request: NextRequest) {
  const denied = protectMutation(request);
  if (denied) {
    return denied;
  }
  db.delete(progress)
    .where(
      sql`${progress.mediaId} IN (SELECT id FROM media WHERE provider_id = ${activeProviderId() ?? ''})`,
    )
    .run();
  return NextResponse.json({ ok: true });
}
