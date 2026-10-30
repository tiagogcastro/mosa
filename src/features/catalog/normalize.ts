export type MediaType = 'live' | 'movie' | 'series' | 'episode';
export type ImportItem = {
  externalId: string;
  type: MediaType;
  title: string;
  originalTitle: string;
  category?: string;
  artwork?: string;
  description?: string;
  year?: number;
  parentId?: string;
  season?: number;
  episode?: number;
  extension?: string;
  sourceUrl?: string;
};

export function normalizeTitle(raw: string) {
  const clean = raw
    .replace(/^(?:BR|PT|EN|ES)\s*\|\s*/i, '')
    .replace(/\s*(?:\b(?:1080p|720p|2160p|4k|HD|FHD|DUB|LEG)\b\s*)+$/gi, '')
    .trim();
  return clean || raw.trim();
}
export function normalizeCategory(raw: string) {
  const name = raw
    .replace(/^(?:BR|PT|ES|EN)\s*[|:-]\s*/i, '')
    .replace(/\b(?:HD|FHD|4K)\b/gi, '')
    .trim();
  if (/sport|esporte/i.test(name)) {
    return 'Sports';
  }
  if (/news|notícia|noticia|jornal/i.test(name)) {
    return 'News';
  }
  if (/kids|infantil|niños/i.test(name)) {
    return 'Kids';
  }
  return name || 'Other';
}
