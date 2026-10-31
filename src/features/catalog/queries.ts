import 'server-only';
import { and, asc, desc, eq, gt, like, lt, or, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { favorites, media, progress, providers } from '@/db/schema';
import { activeProviderId } from '@/features/providers/active';

function activeCondition() {
  return eq(providers.id, activeProviderId() ?? '');
}

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

export function catalog(
  type: string,
  search = '',
  category = '',
  page = 1,
  size = 48,
  sort: 'recent' | 'alpha' = 'recent',
) {
  const conditions = [eq(media.type, type), activeCondition()];
  if (search) {
    conditions.push(searchCondition(search));
  }
  if (category) {
    conditions.push(eq(media.category, category));
  }
  const order =
    sort === 'alpha'
      ? [asc(sql`${media.title} collate nocase`), asc(media.id)]
      : [desc(media.addedAt), asc(media.id)];

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
    .orderBy(...order)
    .limit(size)
    .offset((Math.max(1, page) - 1) * size)
    .all();
}
export function catalogCount(type: string, search = '', category = '') {
  const conditions = [eq(media.type, type), activeCondition()];
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
    .where(and(eq(media.type, type), activeCondition()))
    .groupBy(media.category)
    .orderBy(asc(media.category))
    .all()
    .filter((category): category is { name: string; count: number } => !!category.name);
}
export function catalogPageForItem(
  item: typeof media.$inferSelect,
  size: number,
  sort: 'recent' | 'alpha',
) {
  const before =
    sort === 'alpha'
      ? sql`(${media.title} collate nocase < ${item.title} collate nocase or (${media.title} collate nocase = ${item.title} collate nocase and ${media.id} < ${item.id}))`
      : or(
          gt(media.addedAt, item.addedAt),
          and(eq(media.addedAt, item.addedAt), lt(media.id, item.id)),
        );
  const count =
    db
      .select({ count: sql<number>`count(*)` })
      .from(media)
      .where(
        and(
          eq(media.providerId, item.providerId),
          eq(media.type, item.type),
          item.category ? eq(media.category, item.category) : undefined,
          before,
        ),
      )
      .get()?.count ?? 0;
  return Math.floor(count / size) + 1;
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
    .where(and(eq(media.id, id), activeCondition()))
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
    .where(activeCondition())
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
    .where(and(eq(progress.completed, false), activeCondition(), sql`${progress.position} > 0`))
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
    .where(and(eq(media.type, 'live'), activeCondition()))
    .orderBy(desc(progress.watchedAt))
    .limit(16)
    .all();
}
