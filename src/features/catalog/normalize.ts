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
  // Category names belong to the provider. Keep genres, brands, regions and
  // quality variants distinct instead of collapsing them into generic labels.
  return raw.replace(/[\u0000-\u001f]/g, ' ').trim() || 'Other';
}
