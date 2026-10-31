import 'server-only';
import { randomUUID } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db/client';
import { media, providers } from '@/db/schema';
import { activeProviderId, selectActiveProvider } from '@/features/providers/active';
import { encrypt, decrypt } from '@/lib/security/crypto';
import { fetchRemote } from '@/lib/security/remote';
import type { ImportItem } from '@/features/catalog/normalize';
import type { Result } from '@/lib/result';
import { parseM3u } from '@/features/providers/adapters/m3u';
import {
  authenticateStalker,
  importStalker,
  stalkerConfig,
  stalkerSource,
  type StalkerConfig,
} from '@/features/providers/adapters/stalker';
import {
  checkXtream,
  importXtream,
  xtreamSource,
  xtreamConfig,
  type XtreamConfig,
  xtreamEpisodes,
} from '@/features/providers/adapters/xtream';

export const connectionSchema = z.discriminatedUnion('type', [
  stalkerConfig.extend({ type: z.literal('stalker'), name: z.string().trim().min(1).max(80) }),
  z.object({
    type: z.literal('xtream'),
    name: z.string().trim().min(1).max(80),
    server: z.url(),
    username: z.string().min(1),
    password: z.string().min(1),
  }),
  z.object({
    type: z.literal('quick'),
    name: z.string().trim().min(1).max(80),
    username: z.string().trim().min(1).max(256),
    password: z.string().min(1).max(256),
    code: z.string().trim().max(80).optional(),
    server: z.url().optional(),
    serverId: z.string().uuid().optional(),
  }),
  z
    .object({
      type: z.literal('m3u'),
      name: z.string().trim().min(1).max(80),
      url: z.url().optional(),
      content: z
        .string()
        .max(8 * 1024 * 1024)
        .optional(),
    })
    .refine((value) => !!(value.url || value.content), 'Playlist required'),
]);
export type Connection = z.infer<typeof connectionSchema>;
export type StoredConnection = Exclude<Connection, { type: 'quick' }>;
function resolveQuick(config: Extract<Connection, { type: 'quick' }>) {
  const existing = config.serverId
    ? db.select().from(providers).where(eq(providers.id, config.serverId)).get()
    : null;
  if (config.serverId && (!existing || existing.type !== 'xtream')) {
    throw new Error('Selected server unavailable');
  }
  const stored = existing ? decrypt<XtreamConfig>(existing.encryptedConfig) : null;
  const server = config.server ?? stored?.server;
  if (!server) {
    throw new Error('Server URL or explicitly selected source is required');
  }
  return {
    type: 'xtream' as const,
    name: config.name,
    server,
    username: config.username,
    password: config.password,
  };
}
export async function inspectConnection(config: Connection) {
  if (config.type === 'quick') {
    return inspectConnection(resolveQuick(config));
  }
  if (config.type === 'stalker') {
    const { expiresAt } = await authenticateStalker(config);
    return { status: 'Authenticated', expiration: expiresAt };
  }
  if (config.type === 'xtream') {
    return checkXtream(xtreamConfig.parse(config));
  }
  const playlist = config.content ?? (config.url ? await fetchRemote(config.url) : '');
  const items = parseM3u(playlist);
  return { count: items.length };
}
export async function importConnection(config: Connection) {
  if (config.type === 'quick') {
    return importConnection(resolveQuick(config));
  }
  let items: ImportItem[];

  if (config.type === 'stalker') {
    items = await importStalker(config);
  } else if (config.type === 'xtream') {
    await checkXtream(config);
    items = await importXtream(config);
  } else {
    const playlist = config.content ?? (config.url ? await fetchRemote(config.url) : '');
    items = parseM3u(playlist);
  }

  const providerId = randomUUID();
  db.transaction((tx) => {
    tx.insert(providers)
      .values({
        id: providerId,
        name: config.name,
        type: config.type,
        encryptedConfig: encrypt(
          config.type === 'm3u' && config.content ? { type: 'm3u', local: true } : config,
        ),
        syncedAt: new Date(),
      })
      .run();
    insertItems(tx, providerId, items);
  });
  selectActiveProvider(providerId);
  return { id: providerId, count: items.length };
}
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
function insertItems(tx: Transaction, providerId: string, items: ImportItem[]) {
  for (let index = 0; index < items.length; index += 200) {
    tx.insert(media)
      .values(
        items.slice(index, index + 200).map((item) => ({
          id: `${providerId}:${item.type}:${item.externalId}`,
          providerId,
          externalId: item.externalId,
          type: item.type,
          title: item.title,
          originalTitle: item.originalTitle,
          category: item.category,
          artwork: item.artwork,
          description: item.description,
          year: item.year,
          parentId: item.parentId,
          season: item.season,
          episode: item.episode,
          extension: item.extension,
          sourceUrl: item.sourceUrl ? encrypt(item.sourceUrl) : undefined,
          addedAt: new Date(),
        })),
      )
      .onConflictDoUpdate({
        target: media.id,
        set: {
          title: sql`excluded.title`,
          originalTitle: sql`excluded.original_title`,
          description: sql`excluded.description`,
          category: sql`excluded.category`,
          artwork: sql`excluded.artwork`,
          year: sql`excluded.year`,
          extension: sql`excluded.extension`,
          sourceUrl: sql`excluded.source_url`,
        },
      })
      .run();
  }
}
export async function refreshProvider(providerId: string): Promise<Result<{ count: number }>> {
  const provider = db.select().from(providers).where(eq(providers.id, providerId)).get();
  if (!provider || provider.type === 'demo') {
    return { success: false, error: 'PROVIDER_NOT_FOUND' };
  }
  const config = decrypt<StoredConnection | { local: true }>(provider.encryptedConfig);
  if ('local' in config) {
    return { success: false, error: 'LOCAL_FILE_REQUIRED' };
  }
  if (config.type === 'm3u' && !config.url) {
    return { success: false, error: 'INVALID_INPUT' };
  }
  const items =
    config.type === 'stalker'
      ? await importStalker(config)
      : config.type === 'xtream'
        ? await importXtream(config)
        : parseM3u(await fetchRemote(config.url ?? ''));
  db.transaction((tx) => {
    insertItems(tx, providerId, items);
    tx.update(providers)
      .set({ syncedAt: new Date(), status: 'ready' })
      .where(eq(providers.id, providerId))
      .run();
  });
  return { success: true, data: { count: items.length } };
}
export async function resolveSource(
  mediaId: string,
): Promise<Result<{ url: string; format: string }>> {
  const item = db.select().from(media).where(eq(media.id, mediaId)).get();
  if (!item) {
    return { success: false, error: 'MEDIA_NOT_FOUND' };
  }
  const provider = db.select().from(providers).where(eq(providers.id, item.providerId)).get();
  if (!provider?.enabled || provider.id !== activeProviderId()) {
    return { success: false, error: 'SOURCE_UNAVAILABLE' };
  }
  let url = item.sourceUrl;
  if (provider.type === 'stalker') {
    if (item.type !== 'live' || !url) {
      return { success: false, error: 'SOURCE_UNAVAILABLE' };
    }
    url = await stalkerSource(
      decrypt<StalkerConfig>(provider.encryptedConfig),
      decrypt<string>(url),
    );
  }
  if (provider.type === 'm3u' && url) {
    url = decrypt<string>(url);
  }
  if (provider.type === 'xtream') {
    url = xtreamSource(
      decrypt<XtreamConfig>(provider.encryptedConfig),
      item.type,
      item.externalId,
      item.extension || 'mp4',
    );
  }
  if (!url) {
    return { success: false, error: 'SOURCE_UNAVAILABLE' };
  }
  const format = /\.m3u8(?:\?|$)/i.test(url)
    ? 'hls'
    : /\.mpd(?:\?|$)/i.test(url)
      ? 'dash'
      : 'direct';
  return { success: true, data: { url, format } };
}
export async function loadSeriesEpisodes(seriesId: string) {
  const series = db.select().from(media).where(eq(media.id, seriesId)).get();
  if (!series || series.type !== 'series') {
    return [];
  }
  const provider = db.select().from(providers).where(eq(providers.id, series.providerId)).get();
  const existing = db.select().from(media).where(eq(media.parentId, seriesId)).all();
  if (!provider?.enabled || provider.type !== 'xtream' || existing.length) {
    return existing;
  }
  const items = await xtreamEpisodes(
    decrypt<XtreamConfig>(provider.encryptedConfig),
    series.externalId,
  );
  db.transaction((tx) => {
    for (const item of items) {
      tx.insert(media)
        .values({
          id: `${series.providerId}:episode:${item.externalId}`,
          providerId: series.providerId,
          externalId: item.externalId,
          type: 'episode',
          title: item.title,
          originalTitle: item.originalTitle,
          description: item.description,
          artwork: item.artwork,
          parentId: seriesId,
          season: item.season,
          episode: item.episode,
          extension: item.extension,
          addedAt: new Date(),
        })
        .onConflictDoNothing()
        .run();
    }
  });
  return db.select().from(media).where(eq(media.parentId, seriesId)).all();
}
