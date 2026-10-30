import { z } from 'zod';
import { fetchRemote } from '@/lib/security/remote';
import { ImportItem, normalizeCategory, normalizeTitle } from '@/features/catalog/normalize';

export const xtreamConfig = z.object({
  server: z.url(),
  username: z.string().min(1).max(256),
  password: z.string().min(1).max(256),
});
export type XtreamConfig = z.infer<typeof xtreamConfig>;
const object = z.record(z.string(), z.unknown());
function string(value: unknown) {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}
function endpoint(config: XtreamConfig, action?: string) {
  const url = new URL(
    'player_api.php',
    config.server.endsWith('/') ? config.server : `${config.server}/`,
  );
  url.searchParams.set('username', config.username);
  url.searchParams.set('password', config.password);
  if (action) {
    url.searchParams.set('action', action);
  }
  return url.toString();
}
async function get(config: XtreamConfig, action?: string, id?: string): Promise<unknown> {
  const url = new URL(endpoint(config, action));
  if (id) {
    url.searchParams.set('series_id', id);
  }
  return JSON.parse(await fetchRemote(url.toString()));
}
export async function xtreamEpisodes(
  config: XtreamConfig,
  seriesId: string,
): Promise<ImportItem[]> {
  const details = object.parse(await get(config, 'get_series_info', seriesId));
  const seasons = object.parse(details.episodes);
  const episodes: ImportItem[] = [];
  for (const [seasonKey, entries] of Object.entries(seasons)) {
    const season = Number(seasonKey);
    if (!Number.isSafeInteger(season) || !Array.isArray(entries)) {
      continue;
    }
    for (const raw of entries.slice(0, 200)) {
      const entry = object.safeParse(raw);
      if (!entry.success) {
        continue;
      }
      const id = string(entry.data.id);
      if (!id) {
        continue;
      }
      const number = Number(entry.data.episode_num);
      const info = object.safeParse(entry.data.info);
      episodes.push({
        externalId: id,
        type: 'episode',
        title: string(entry.data.title) || `Episode ${number}`,
        originalTitle: string(entry.data.title) || `Episode ${number}`,
        season,
        episode: Number.isSafeInteger(number) ? number : undefined,
        description: info.success ? string(info.data.plot) || undefined : undefined,
        artwork: info.success ? string(info.data.movie_image) || undefined : undefined,
        extension: string(entry.data.container_extension) || 'mp4',
      });
    }
  }
  return episodes.slice(0, 2000);
}
export async function checkXtream(config: XtreamConfig) {
  const response = object.parse(await get(config));
  const user = object.parse(response.user_info);
  if (String(user.auth) !== '1') {
    throw new Error('Invalid credentials');
  }
  return {
    status: string(user.status) || 'Active',
    expiration: string(user.exp_date) || null,
    maxConnections: string(user.max_connections) || null,
  };
}
export async function importXtream(config: XtreamConfig): Promise<ImportItem[]> {
  const actions = ['get_live_streams', 'get_vod_streams', 'get_series'];
  const categories = await Promise.all(
    ['get_live_categories', 'get_vod_categories', 'get_series_categories'].map(async (action) => {
      try {
        const result = z.array(object).parse(await get(config, action));
        return new Map(
          result.map((entry) => [string(entry.category_id), string(entry.category_name)]),
        );
      } catch {
        return new Map<string, string>();
      }
    }),
  );
  const result: ImportItem[] = [];
  for (let i = 0; i < actions.length; i++) {
    const entries = z.array(object).parse(await get(config, actions[i]));
    for (const entry of entries.slice(0, 20000)) {
      const type = (['live', 'movie', 'series'] as const)[i];
      const id = string(entry.stream_id || entry.series_id);
      if (!id) {
        continue;
      }
      const originalTitle = string(entry.name || entry.title);
      result.push({
        externalId: id,
        type,
        originalTitle,
        title: normalizeTitle(originalTitle),
        category: normalizeCategory(categories[i].get(string(entry.category_id)) || 'Other'),
        artwork: string(entry.stream_icon || entry.cover) || undefined,
        extension: string(entry.container_extension) || (type === 'live' ? 'm3u8' : 'mp4'),
      });
    }
  }
  return result;
}
export function xtreamSource(config: XtreamConfig, type: string, id: string, extension: string) {
  const path = type === 'live' ? 'live' : type === 'episode' ? 'series' : 'movie';
  const safeExtension = /^[a-z\d]{2,5}$/i.test(extension) ? extension : 'mp4';
  return new URL(
    `${path}/${encodeURIComponent(config.username)}/${encodeURIComponent(config.password)}/${encodeURIComponent(id)}.${safeExtension}`,
    config.server.endsWith('/') ? config.server : `${config.server}/`,
  ).toString();
}
