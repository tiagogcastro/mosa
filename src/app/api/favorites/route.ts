import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db/client';
import { favorites } from '@/db/schema';
import { failure, protectMutation } from '@/lib/security/request';
import { mediaIsVisible } from '@/features/catalog/restrictions';
import { activeProviderId } from '@/features/providers/active';
import { media } from '@/db/schema';
export const runtime = 'nodejs';
const schema = z.object({ mediaId: z.string().min(1), favorite: z.boolean() });
export async function POST(request: NextRequest) {
  const denied = protectMutation(request);
  if (denied) {
    return denied;
  }
  try {
    const { mediaId, favorite } = schema.parse(await request.json());
    if (
      !mediaIsVisible(mediaId) ||
      !db
        .select({ id: media.id })
        .from(media)
        .where(and(eq(media.id, mediaId), eq(media.providerId, activeProviderId() ?? '')))
        .get()
    ) {
      return NextResponse.json({ error: 'MEDIA_UNAVAILABLE' }, { status: 404 });
    }
    if (favorite) {
      db.insert(favorites).values({ mediaId, createdAt: new Date() }).onConflictDoNothing().run();
    } else {
      db.delete(favorites).where(eq(favorites.mediaId, mediaId)).run();
    }
    return NextResponse.json({ favorite });
  } catch (error) {
    return failure(error);
  }
}
