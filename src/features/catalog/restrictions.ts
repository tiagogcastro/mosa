import 'server-only';

import { randomUUID } from 'node:crypto';
import { and, eq, exists, like, not, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { contentRestrictions, media } from '@/db/schema';
import { activeProfile } from '@/features/profiles/service';

export const restrictionTypes = [
  'live_category',
  'live_channel',
  'movie_category',
  'series_category',
] as const;
export type RestrictionType = (typeof restrictionTypes)[number];

export function isAdultCategory(name: string) {
  return /(?:^|[^\p{L}\d])(?:adult(?:o|os|s)?|xxx|porn(?:o)?|explicit|18\+)(?=$|[^\p{L}\d])/iu.test(
    name,
  );
}

export function visibleMediaCondition() {
  const profileId = activeProfile().id;
  return sql`NOT EXISTS (
    SELECT 1 FROM content_restrictions restriction
    WHERE restriction.profile_id = ${profileId} AND restriction.provider_id = ${media.providerId}
      AND ((restriction.target_type = 'live_channel' AND restriction.target_id = ${media.id})
        OR (restriction.target_type = 'live_category' AND ${media.type} = 'live' AND restriction.target_id = ${media.category})
        OR (restriction.target_type = 'movie_category' AND ${media.type} = 'movie' AND restriction.target_id = ${media.category})
        OR (restriction.target_type = 'series_category' AND ${media.type} = 'series' AND restriction.target_id = ${media.category})
        OR (restriction.target_type = 'series_category' AND ${media.type} = 'episode' AND EXISTS (
          SELECT 1 FROM media parent WHERE parent.id = ${media.parentId} AND parent.category = restriction.target_id
        )))
  )`;
}

export function mediaIsVisible(id: string) {
  return !!db
    .select({ id: media.id })
    .from(media)
    .where(and(eq(media.id, id), visibleMediaCondition()))
    .get();
}

export function applyAdultDefaults(profileId: string, providerId: string) {
  const categories = db
    .select({ type: media.type, category: media.category })
    .from(media)
    .where(eq(media.providerId, providerId))
    .groupBy(media.type, media.category)
    .all();
  for (const { type, category } of categories) {
    if (!category || !['live', 'movie', 'series'].includes(type) || !isAdultCategory(category)) {
      continue;
    }
    const targetType = `${type}_category`;
    const unblockedByOwner = db
      .select({ id: contentRestrictions.id })
      .from(contentRestrictions)
      .where(
        and(
          eq(contentRestrictions.profileId, profileId),
          eq(contentRestrictions.providerId, providerId),
          eq(contentRestrictions.targetType, `adult_exception:${targetType}`),
          eq(contentRestrictions.targetId, category),
        ),
      )
      .get();
    if (unblockedByOwner) {
      continue;
    }
    db.insert(contentRestrictions)
      .values({
        id: randomUUID(),
        profileId,
        providerId,
        targetType,
        targetId: category,
        createdAt: new Date(),
      })
      .onConflictDoNothing()
      .run();
  }
}

export function restrictionOptions(
  type: RestrictionType,
  search: string,
  filter: 'all' | 'visible' | 'blocked',
  page: number,
) {
  const profile = activeProfile();
  if (!profile.providerId) {
    return { items: [], total: 0 };
  }
  const mediaType = type.split('_')[0];
  const target = type === 'live_channel' ? media.id : media.category;
  const label = type === 'live_channel' ? media.title : media.category;
  const blocked = exists(
    db
      .select({ id: contentRestrictions.id })
      .from(contentRestrictions)
      .where(
        and(
          eq(contentRestrictions.profileId, profile.id),
          eq(contentRestrictions.providerId, profile.providerId),
          eq(contentRestrictions.targetType, type),
          eq(contentRestrictions.targetId, target),
        ),
      ),
  );
  const conditions = [eq(media.providerId, profile.providerId), eq(media.type, mediaType)];
  if (search) {
    conditions.push(
      like(sql`lower(${label})`, `%${search.toLowerCase().replace(/[\\%_]/g, '\\$&')}%`),
    );
  }
  if (filter !== 'all') {
    conditions.push(filter === 'blocked' ? blocked : not(blocked));
  }
  const where = and(...conditions);
  const total =
    db
      .select({ value: sql<number>`count(distinct ${target})` })
      .from(media)
      .where(where)
      .get()?.value ?? 0;
  const items = db
    .select({
      id: target,
      label,
      count: sql<number>`count(*)`,
      blocked: sql<number>`cast(${blocked} as integer)`,
    })
    .from(media)
    .where(where)
    .groupBy(target)
    .orderBy(label)
    .limit(40)
    .offset((page - 1) * 40)
    .all()
    .filter(
      (entry): entry is { id: string; label: string; count: number; blocked: number } =>
        !!entry.id && !!entry.label,
    );
  return { items, total };
}

export function setRestriction(type: RestrictionType, targetId: string, blocked: boolean) {
  const profile = activeProfile();
  if (!profile.providerId) {
    return false;
  }
  const target = type === 'live_channel' ? media.id : media.category;
  const item = db
    .select({ id: media.id })
    .from(media)
    .where(
      and(
        eq(media.providerId, profile.providerId),
        eq(media.type, type.split('_')[0]),
        eq(target, targetId),
      ),
    )
    .get();
  if (!item) {
    return false;
  }
  if (blocked) {
    db.delete(contentRestrictions)
      .where(
        and(
          eq(contentRestrictions.profileId, profile.id),
          eq(contentRestrictions.providerId, profile.providerId),
          eq(contentRestrictions.targetType, `adult_exception:${type}`),
          eq(contentRestrictions.targetId, targetId),
        ),
      )
      .run();
    db.insert(contentRestrictions)
      .values({
        id: randomUUID(),
        profileId: profile.id,
        providerId: profile.providerId,
        targetType: type,
        targetId,
        createdAt: new Date(),
      })
      .onConflictDoNothing()
      .run();
  } else {
    db.delete(contentRestrictions)
      .where(
        and(
          eq(contentRestrictions.profileId, profile.id),
          eq(contentRestrictions.providerId, profile.providerId),
          eq(contentRestrictions.targetType, type),
          eq(contentRestrictions.targetId, targetId),
        ),
      )
      .run();
    if (type.endsWith('_category') && isAdultCategory(targetId)) {
      db.insert(contentRestrictions)
        .values({
          id: randomUUID(),
          profileId: profile.id,
          providerId: profile.providerId,
          targetType: `adult_exception:${type}`,
          targetId,
          createdAt: new Date(),
        })
        .onConflictDoNothing()
        .run();
    }
  }
  return true;
}

export function blockAdultCategories() {
  const profile = activeProfile();
  if (!profile.providerId) {
    return 0;
  }
  const before =
    db
      .select({ count: sql<number>`count(*)` })
      .from(contentRestrictions)
      .where(
        and(
          eq(contentRestrictions.profileId, profile.id),
          not(like(contentRestrictions.targetType, 'adult_exception:%')),
        ),
      )
      .get()?.count ?? 0;
  db.delete(contentRestrictions)
    .where(
      and(
        eq(contentRestrictions.profileId, profile.id),
        eq(contentRestrictions.providerId, profile.providerId),
        like(contentRestrictions.targetType, 'adult_exception:%'),
      ),
    )
    .run();
  applyAdultDefaults(profile.id, profile.providerId);
  const after =
    db
      .select({ count: sql<number>`count(*)` })
      .from(contentRestrictions)
      .where(
        and(
          eq(contentRestrictions.profileId, profile.id),
          not(like(contentRestrictions.targetType, 'adult_exception:%')),
        ),
      )
      .get()?.count ?? 0;
  return after - before;
}
