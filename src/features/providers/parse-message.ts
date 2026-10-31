/** Extract only credentials and explicitly supplied provider endpoints. Never probe webplayer links. */
export function parseProviderMessage(message: string) {
  const result: {
    username?: string;
    password?: string;
    code?: string;
    server?: string;
    playlist?: string;
    liveFormat?: 'm3u8' | 'ts';
  } = {};
  for (const line of message.split(/\r?\n/)) {
    const match = line.match(
      /(?:^|\s)(usu[aá]rio|username|user|senha|password|c[oó]digo|pin|dns\s+principal|dns\s+smarters|servidor|server|lista\s+m3u)\s*[:=]\s*(.+)$/i,
    );
    if (!match) {
      continue;
    }
    const label = match[1].toLowerCase();
    const value = match[2]
      .trim()
      .replace(/^\*+|\*+$/g, '')
      .trim();
    if (/usu[aá]rio|username|user/.test(label)) {
      result.username = value;
    } else if (/senha|password/.test(label)) {
      result.password = value;
    } else if (/c[oó]digo|pin/.test(label)) {
      result.code = value;
    } else if (/lista\s+m3u/.test(label) && /^https?:\/\//i.test(value)) {
      result.playlist = value;
      try {
        const format = new URL(value).searchParams.get('output');
        if (format === 'm3u8' || format === 'ts') {
          result.liveFormat = format;
        }
      } catch {
        // A malformed playlist link is not an API endpoint.
      }
    } else if (/dns\s+principal|servidor|server/.test(label) && /^https?:\/\//i.test(value)) {
      result.server = value;
    } else if (/dns\s+smarters/.test(label) && !result.server && /^https?:\/\//i.test(value)) {
      result.server = value;
    }
  }
  return result;
}
