import 'server-only';
import { and, desc, eq, like, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { favorites, media, progress, providers } from '@/db/schema';

export function catalog(type: string, search = '', category = '', page = 1) {
  const conditions = [eq(media.type, type), eq(providers.enabled, true)];
  if (search) {
    conditions.push(like(sql`lower(${media.title})`, `%${search.toLowerCase()}%`));
  }
  if (category) {
    conditions.push(eq(media.category, category));
  }
  return db
    .select({
      item: media,
      favorite: favorites.mediaId,
      position: progress.position,
      duration: progress.duration,
    })
    .from(media)
    .innerJoin(providers, eq(providers.id, media.providerId))
    .leftJoin(favorites, eq(favorites.mediaId, media.id))
    .leftJoin(progress, eq(progress.mediaId, media.id))
    .where(and(...conditions))
    .orderBy(desc(media.addedAt))
    .limit(48)
    .offset((Math.max(1, page) - 1) * 48)
    .all();
}
export function mediaById(id: string) {
  return db
    .select({
      item: media,
      provider: providers.name,
      favorite: favorites.mediaId,
      position: progress.position,
      duration: progress.duration,
    })
    .from(media)
    .innerJoin(providers, eq(providers.id, media.providerId))
    .leftJoin(favorites, eq(favorites.mediaId, media.id))
    .leftJoin(progress, eq(progress.mediaId, media.id))
    .where(and(eq(media.id, id), eq(providers.enabled, true)))
    .get();
}
export function saved() {
  return db
    .select({
      item: media,
      favorite: favorites.mediaId,
      position: progress.position,
      duration: progress.duration,
    })
    .from(media)
    .innerJoin(providers, eq(providers.id, media.providerId))
    .innerJoin(favorites, eq(favorites.mediaId, media.id))
    .leftJoin(progress, eq(progress.mediaId, media.id))
    .where(eq(providers.enabled, true))
    .orderBy(desc(favorites.createdAt))
    .limit(80)
    .all();
}
export function continuing() {
  return db
    .select({
      item: media,
      favorite: favorites.mediaId,
      position: progress.position,
      duration: progress.duration,
    })
    .from(progress)
    .innerJoin(media, eq(progress.mediaId, media.id))
    .innerJoin(providers, eq(providers.id, media.providerId))
    .leftJoin(favorites, eq(favorites.mediaId, media.id))
    .where(
      and(
        eq(progress.completed, false),
        eq(providers.enabled, true),
        sql`${progress.position} > 0`,
      ),
    )
    .orderBy(desc(progress.watchedAt))
    .limit(24)
    .all();
}
export function recentChannels() {
  return db
    .select({
      item: media,
      favorite: favorites.mediaId,
      position: progress.position,
      duration: progress.duration,
    })
    .from(progress)
    .innerJoin(media, eq(progress.mediaId, media.id))
    .innerJoin(providers, eq(providers.id, media.providerId))
    .leftJoin(favorites, eq(favorites.mediaId, media.id))
    .where(and(eq(media.type, 'live'), eq(providers.enabled, true)))
    .orderBy(desc(progress.watchedAt))
    .limit(16)
    .all();
}
