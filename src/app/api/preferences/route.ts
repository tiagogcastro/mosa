import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db/client';
import { preferences } from '@/db/schema';
import { failure, protectMutation } from '@/lib/security/request';

export const runtime = 'nodejs';
const settings = z.discriminatedUnion('key', [
  z.object({ key: z.literal('sidebar_collapsed'), value: z.enum(['true', 'false']) }),
  z.object({ key: z.literal('timezone'), value: z.string().max(80) }),
  z.object({ key: z.literal('autoplay_next'), value: z.enum(['true', 'false']) }),
  z.object({ key: z.literal('restore_channel'), value: z.enum(['true', 'false']) }),
  z.object({ key: z.literal('playback_speed'), value: z.enum(['0.75', '1', '1.25', '1.5', '2']) }),
  z.object({ key: z.literal('language'), value: z.enum(['pt-BR', 'en', 'es']) }),
  z.object({ key: z.literal('theme'), value: z.enum(['dark', 'light']) }),
]);
export async function PATCH(request: NextRequest) {
  const denied = protectMutation(request);
  if (denied) {
    return denied;
  }
  try {
    const { key, value } = settings.parse(await request.json());
    if (
      key === 'timezone' &&
      value &&
      !Intl.supportedValuesOf('timeZone').includes(value) &&
      value !== 'UTC'
    ) {
      return NextResponse.json({ error: 'INVALID_TIMEZONE' }, { status: 400 });
    }
    db.insert(preferences)
      .values({ key, value })
      .onConflictDoUpdate({ target: preferences.key, set: { value } })
      .run();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
export function GET() {
  return NextResponse.json(
    Object.fromEntries(
      db
        .select()
        .from(preferences)
        .all()
        .filter(({ key }) => key !== 'device_id')
        .map(({ key, value }) => [key, value]),
    ),
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
