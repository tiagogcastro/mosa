import { createHash } from 'node:crypto';
import { ImportItem, normalizeCategory, normalizeTitle } from '@/features/catalog/normalize';

export function parseM3u(content: string): ImportItem[] {
  if (Buffer.byteLength(content) > 8 * 1024 * 1024 || !content.trimStart().startsWith('#EXTM3U')) {
    throw new Error('Invalid or oversized M3U playlist');
  }
  const lines = content.split(/\r?\n/);
  const items: ImportItem[] = [];
  let metadata: { title: string; category?: string; artwork?: string; id?: string } | null = null;
  for (const line of lines) {
    const value = line.trim();
    if (value.startsWith('#EXTINF:')) {
      const attributes = Object.fromEntries(
        [...value.matchAll(/([\w-]+)="([^"]*)"/g)].map((match) => [match[1], match[2]]),
      );
      metadata = {
        title:
          value.slice(value.lastIndexOf(',') + 1).trim() || attributes['tvg-name'] || 'Untitled',
        category: attributes['group-title'],
        artwork: attributes['tvg-logo'],
        id: attributes['tvg-id'],
      };
    } else if (metadata && value && !value.startsWith('#')) {
      try {
        const url = new URL(value);
        if (!['http:', 'https:'].includes(url.protocol)) {
          metadata = null;
          continue;
        }
        const originalTitle = metadata.title;
        items.push({
          externalId: createHash('sha256')
            .update(metadata.id ? `${metadata.id}:${value}` : value)
            .digest('hex')
            .slice(0, 32),
          type: 'live',
          title: normalizeTitle(originalTitle),
          originalTitle,
          category: normalizeCategory(metadata.category || 'Other'),
          artwork: metadata.artwork,
          sourceUrl: value,
        });
      } catch {
        /* Skip invalid playlist entries. */
      }
      metadata = null;
      if (items.length >= 20000) {
        break;
      }
    }
  }
  if (!items.length) {
    throw new Error('Playlist has no supported entries');
  }
  return items;
}
