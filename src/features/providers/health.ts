import 'server-only';

import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db/client';
import { media, preferences } from '@/db/schema';
import { visibleMediaCondition } from '@/features/catalog/restrictions';
import { activeProviderId } from '@/features/providers/active';
import { resolveSource } from '@/features/providers/service';
import { validateRemoteUrl } from '@/lib/security/remote';

const healthSchema = z.object({
  state: z.enum(['ready', 'warning', 'error']),
  checkedAt: z.number(),
  checked: z.number(),
  succeeded: z.number(),
  reason: z.enum(['none', 'access', 'missing', 'timeout', 'network', 'response']),
});
export type SourceHealth = z.infer<typeof healthSchema>;
const healthKey = (id: string) => `source-health:${id}`;

export function savedSourceHealth(id: string | null): SourceHealth | null {
  if (!id) {
    return null;
  }
  const raw = db
    .select({ value: preferences.value })
    .from(preferences)
    .where(eq(preferences.key, healthKey(id)))
    .get()?.value;
  if (!raw) {
    return null;
  }
  try {
    return healthSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function clearSourceHealth(id: string) {
  db.delete(preferences)
    .where(eq(preferences.key, healthKey(id)))
    .run();
}

type Failure = SourceHealth['reason'];
function stopReading(response: Response) {
  void response.body?.cancel().catch(() => {});
}
async function checkStream(input: string, format: string): Promise<Failure> {
  let url = input;
  try {
    const signal = AbortSignal.timeout(7000);
    for (let redirects = 0; redirects < 3; redirects++) {
      await validateRemoteUrl(url);
      const response = await fetch(url, {
        method: 'GET',
        headers: { Range: 'bytes=0-1023', Accept: '*/*' },
        cache: 'no-store',
        redirect: 'manual',
        signal,
      });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        stopReading(response);
        if (!location) {
          return 'response';
        }
        url = new URL(location, url).toString();
        continue;
      }
      if (response.status === 401 || response.status === 403) {
        stopReading(response);
        return 'access';
      }
      if (response.status === 404 || response.status === 410) {
        stopReading(response);
        return 'missing';
      }
      if (response.status !== 200 && response.status !== 206) {
        stopReading(response);
        return 'response';
      }
      const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
      if (/text\/html|application\/(?:json|xml)/.test(contentType)) {
        stopReading(response);
        return 'response';
      }
      const reader = response.body?.getReader();
      if (!reader) {
        return 'response';
      }
      const first = await reader.read();
      void reader.cancel().catch(() => {});
      if (first.done || !first.value?.length) {
        return 'response';
      }
      const preview = new TextDecoder().decode(first.value.subarray(0, 512)).trimStart();
      if (/^(?:<!doctype|<html|\{\s*"(?:error|message)")/i.test(preview)) {
        return 'response';
      }
      if (format === 'hls' && !preview.replace(/^\uFEFF/, '').startsWith('#EXTM3U')) {
        return 'response';
      }
      return 'none';
    }
    return 'response';
  } catch (error) {
    return error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')
      ? 'timeout'
      : 'network';
  }
}

export async function checkActiveSource(): Promise<SourceHealth | null> {
  const providerId = activeProviderId();
  if (!providerId) {
    return null;
  }
  const candidates = (['live', 'movie', 'episode'] as const).flatMap((type) =>
    db
      .select({ id: media.id, type: media.type })
      .from(media)
      .where(and(eq(media.providerId, providerId), eq(media.type, type), visibleMediaCondition()))
      .orderBy(media.id)
      .limit(2)
      .all(),
  );
  const first = candidates[0];
  const second =
    candidates.find(({ id, type }) => id !== first?.id && type !== first?.type) ??
    candidates.find(({ id }) => id !== first?.id);
  const samples = [first, second].filter(
    (sample): sample is { id: string; type: string } => !!sample,
  );
  let succeeded = 0;
  let reason: Failure = 'none';
  for (const sample of samples) {
    try {
      const source = await resolveSource(sample.id);
      const result = source.success
        ? await checkStream(source.data.url, source.data.format)
        : 'response';
      if (result === 'none') {
        succeeded++;
      } else {
        reason = result;
      }
    } catch {
      reason = 'network';
    }
  }
  const health: SourceHealth = {
    state:
      succeeded === samples.length && samples.length > 0
        ? 'ready'
        : samples.length > 1 && succeeded === 0
          ? 'error'
          : 'warning',
    checkedAt: Date.now(),
    checked: samples.length,
    succeeded,
    reason: samples.length ? reason : 'missing',
  };
  db.insert(preferences)
    .values({ key: healthKey(providerId), value: JSON.stringify(health) })
    .onConflictDoUpdate({ target: preferences.key, set: { value: JSON.stringify(health) } })
    .run();
  return health;
}
