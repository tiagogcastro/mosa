import 'server-only';
import { and, asc, desc, eq, like, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { favorites, media, progress, providers } from '@/db/schema';

function searchCondition(search: string) {
  let title = sql`${media.title}`;
  for (const [accent, plain] of [
    ['áàâãäÁÀÂÃÄ', 'a'],
    ['éèêëÉÈÊË', 'e'],
    ['íìîïÍÌÎÏ', 'i'],
    ['óòôõöÓÒÔÕÖ', 'o'],
    ['úùûüÚÙÛÜ', 'u'],
    ['çÇ', 'c'],
    ['ñÑ', 'n'],
  ]) {
    for (const character of accent) {
      title = sql`replace(${title}, ${character}, ${plain})`;
    }
  }
  const normalized = search
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  return like(sql`lower(${title})`, `%${normalized}%`);
}

export function catalog(type: string, search = '', category = '', page = 1, size = 48) {
  const conditions = [eq(media.type, type), eq(providers.enabled, true)];
  if (search) {
    conditions.push(searchCondition(search));
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
    .orderBy(desc(media.addedAt), asc(media.id))
    .limit(size)
    .offset((Math.max(1, page) - 1) * size)
    .all();
}
export function catalogCount(type: string, search = '', category = '') {
  const conditions = [eq(media.type, type), eq(providers.enabled, true)];
  if (search) {
    conditions.push(searchCondition(search));
  }
  if (category) {
    conditions.push(eq(media.category, category));
  }
  return (
    db
      .select({ count: sql<number>`count(*)` })
      .from(media)
      .innerJoin(providers, eq(providers.id, media.providerId))
      .where(and(...conditions))
      .get()?.count ?? 0
  );
}
export function catalogCategories(type: string) {
  return db
    .select({ name: media.category, count: sql<number>`count(*)` })
    .from(media)
    .innerJoin(providers, eq(providers.id, media.providerId))
    .where(and(eq(media.type, type), eq(providers.enabled, true)))
    .groupBy(media.category)
    .orderBy(asc(media.category))
    .all()
    .filter((category): category is { name: string; count: number } => !!category.name);
}
export function globalSearch(query: string) {
  if (!query.trim()) {
    return { live: [], movie: [], series: [] };
  }
  return {
    live: catalog('live', query, '', 1, 5),
    movie: catalog('movie', query, '', 1, 5),
    series: catalog('series', query, '', 1, 5),
  };
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
