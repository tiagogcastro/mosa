import 'server-only';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

function publicIp(ip: string) {
  if (ip.includes(':')) {
    return !(/^(::|fc|fd|fe[89ab]|2001:db8)/i.test(ip) || ip === '::1' || ip.startsWith('::ffff:'));
  }
  const parts = ip.split('.').map(Number);
  return !(
    parts[0] === 0 ||
    parts[0] === 10 ||
    parts[0] === 127 ||
    (parts[0] === 169 && parts[1] === 254) ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168) ||
    parts[0] >= 224
  );
}
export async function validateRemoteUrl(input: string) {
  const url = new URL(input);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('Invalid URL');
  }
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) {
    throw new Error('Private network address blocked');
  }
  const ips = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
  if (!ips.length || ips.some(({ address }) => !publicIp(address))) {
    throw new Error('Private network address blocked');
  }
  return url;
}

export async function fetchRemote(
  input: string,
  maxBytes = 8 * 1024 * 1024,
  headers: Record<string, string> = {},
): Promise<string> {
  let url = input;
  for (let i = 0; i < 4; i++) {
    await validateRemoteUrl(url);
    if (Object.keys(headers).length && new URL(url).origin !== new URL(input).origin) {
      throw new Error('Authenticated redirect to another host blocked');
    }
    const response = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(15000),
      cache: 'no-store',
      headers: { Accept: 'application/json, application/x-mpegURL, text/plain, */*', ...headers },
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) {
        throw new Error('Invalid redirect');
      }
      url = new URL(location, url).toString();
      continue;
    }
    if (!response.ok) {
      throw new Error(
        response.status === 401 || response.status === 403
          ? 'Unauthorized source'
          : `Source returned HTTP ${response.status}`,
      );
    }
    if (Number(response.headers.get('content-length')) > maxBytes) {
      throw new Error('Response too large');
    }
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Empty response');
    }
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      size += value.length;
      if (size > maxBytes) {
        await reader.cancel();
        throw new Error('Response too large');
      }
      chunks.push(value);
    }
    return new TextDecoder().decode(Buffer.concat(chunks));
  }
  throw new Error('Too many redirects');
}
