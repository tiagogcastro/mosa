import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db/client';
import { progress } from '@/db/schema';
import { failure, protectMutation } from '@/lib/security/request';
export const runtime = 'nodejs';
const schema = z.object({
  mediaId: z.string().min(1),
  position: z.number().finite().min(0),
  duration: z.number().finite().min(0),
  completed: z.boolean(),
});
export async function POST(request: NextRequest) {
  const denied = protectMutation(request);
  if (denied) {
    return denied;
  }
  try {
    const value = schema.parse(await request.json());
    db.insert(progress)
      .values({
        ...value,
        position: Math.round(value.position),
        duration: Math.round(value.duration),
        watchedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: progress.mediaId,
        set: {
          ...value,
          position: Math.round(value.position),
          duration: Math.round(value.duration),
          watchedAt: new Date(),
        },
      })
      .run();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
export async function DELETE(request: NextRequest) {
  const denied = protectMutation(request);
  if (denied) {
    return denied;
  }
  db.delete(progress).run();
  return NextResponse.json({ ok: true });
}
