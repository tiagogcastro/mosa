import 'server-only';

import { z } from 'zod';
import { fetchRemote, validateRemoteUrl } from '@/lib/security/remote';
import { normalizeCategory, normalizeTitle, type ImportItem } from '@/features/catalog/normalize';

// A portal-issued, registered MAC is supplied by the owner. Mosa never generates or discovers one.
export const stalkerConfig = z.object({
  server: z.url().refine((value) => {
    const url = new URL(value);
    return (
      ['http:', 'https:'].includes(url.protocol) &&
      !url.username &&
      !url.password &&
      !url.search &&
      /\/(?:portal|load)\.php$/i.test(url.pathname)
    );
  }, 'Enter the provider portal.php or server/load.php endpoint'),
  mac: z.string().regex(/^([0-9a-f]{2}:){5}[0-9a-f]{2}$/i, 'Registered MAC required'),
});
export type StalkerConfig = z.infer<typeof stalkerConfig>;

const responseObject = z.record(z.string(), z.unknown());
function text(value: unknown) {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}

async function portalRequest(
  config: StalkerConfig,
  type: string,
  action: string,
  token = '',
  extra: Record<string, string> = {},
) {
  const url = new URL(config.server);
  url.searchParams.set('type', type);
  url.searchParams.set('action', action);
  url.searchParams.set('JsHttpRequest', '1-xml');
  for (const [key, value] of Object.entries(extra)) {
    url.searchParams.set(key, value);
  }
  const headers: Record<string, string> = {
    Cookie: `mac=${config.mac.toUpperCase()}; stb_lang=en; timezone=UTC`,
    'User-Agent':
      'Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG250 stbapp',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const body = await fetchRemote(url.toString(), 8 * 1024 * 1024, headers);
  const parsed = responseObject.parse(JSON.parse(body));
  return parsed.js;
}

export async function authenticateStalker(config: StalkerConfig) {
  stalkerConfig.parse(config);
  const handshake = responseObject.parse(await portalRequest(config, 'stb', 'handshake'));
  const token = text(handshake.token);
  if (!token || token.length > 4096 || text(handshake.not_valid) === '1') {
    throw new Error('Portal handshake rejected');
  }
  const profile = responseObject.parse(await portalRequest(config, 'stb', 'get_profile', token));
  if (
    text(profile.status) === '1' ||
    text(profile.status) === '2' ||
    text(profile.blocked) === '1' ||
    (!text(profile.id) && !text(profile.mac) && !text(profile.login))
  ) {
    throw new Error('Portal account not authorized or requires additional credentials');
  }
  return { token, expiresAt: text(profile.tariff_expired_date) || null };
}

export async function importStalker(config: StalkerConfig): Promise<ImportItem[]> {
  const { token } = await authenticateStalker(config);
  const genreResponse = await portalRequest(config, 'itv', 'get_genres', token);
  const genres = new Map<string, string>();
  if (Array.isArray(genreResponse)) {
    for (const entry of genreResponse) {
      const genre = responseObject.safeParse(entry);
      if (genre.success) {
        genres.set(text(genre.data.id), text(genre.data.title));
      }
    }
  }
  const raw = await portalRequest(config, 'itv', 'get_all_channels', token);
  const page = responseObject.safeParse(raw);
  const entries = Array.isArray(raw) ? raw : page.success ? page.data.data : null;
  if (!Array.isArray(entries)) {
    throw new Error('This portal does not offer a compatible complete live channel list');
  }
  const items: ImportItem[] = [];
  for (const value of entries.slice(0, 20000)) {
    const channel = responseObject.safeParse(value);
    if (!channel.success) {
      continue;
    }
    const id = text(channel.data.id);
    const name = text(channel.data.name);
    if (!id || !name) {
      continue;
    }
    const logo = text(channel.data.logo);
    items.push({
      externalId: id,
      type: 'live',
      title: normalizeTitle(name),
      originalTitle: name,
      category: normalizeCategory(genres.get(text(channel.data.tv_genre_id)) || 'Other'),
      artwork: /^https?:\/\//i.test(logo) ? logo : undefined,
      sourceUrl: text(channel.data.cmd) || undefined,
    });
  }
  if (!items.length) {
    throw new Error('Portal returned no compatible live channels');
  }
  return items;
}

export async function stalkerSource(config: StalkerConfig, command: string) {
  const { token } = await authenticateStalker(config);
  if (!command || command.length > 4096) {
    throw new Error('Channel command unavailable');
  }
  const raw = await portalRequest(config, 'itv', 'create_link', token, { cmd: command });
  const link = responseObject.parse(raw);
  const url = text(link.cmd)
    .replace(/^(?:ffmpeg|auto)\s+/i, '')
    .trim();
  await validateRemoteUrl(url);
  return url;
}
