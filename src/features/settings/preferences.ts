import 'server-only';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { preferences } from '@/db/schema';
import { activeProfile } from '@/features/profiles/service';

export const profileSettings = [
  'autoplay_next',
  'restore_channel',
  'playback_speed',
  'theme',
  'timezone',
  'default_stream_format',
] as const;
export function preferenceKey(key: string) {
  return (profileSettings as readonly string[]).includes(key)
    ? `profile:${activeProfile().id}:${key}`
    : key;
}

export function preference(key: string, fallback = '') {
  return (
    db
      .select()
      .from(preferences)
      .where(eq(preferences.key, preferenceKey(key)))
      .get()?.value ?? fallback
  );
}

export function deviceId() {
  const existing = preference('device_id');
  if (existing) {
    return existing;
  }
  const id = randomUUID();
  db.insert(preferences).values({ key: 'device_id', value: id }).onConflictDoNothing().run();
  return preference('device_id');
}
