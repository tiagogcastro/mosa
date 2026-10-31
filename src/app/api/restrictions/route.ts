import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authEnabled, roleForRequest } from '@/features/auth/service';
import {
  blockAdultCategories,
  restrictionOptions,
  restrictionTypes,
  setRestriction,
} from '@/features/catalog/restrictions';
import { failure, protectMutation } from '@/lib/security/request';

export const runtime = 'nodejs';
const restriction = z.object({
  type: z.enum(restrictionTypes),
  targetId: z.string().min(1).max(500),
  blocked: z.boolean(),
});
function authorized(request: NextRequest) {
  return !authEnabled() || roleForRequest(request) === 'owner';
}

export function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'OWNER_ONLY' }, { status: 403 });
  }
  const params = request.nextUrl.searchParams;
  const type = z.enum(restrictionTypes).safeParse(params.get('type'));
  if (!type.success) {
    return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
  }
  const search = (params.get('q') ?? '').trim().slice(0, 100);
  const filter = z.enum(['all', 'visible', 'blocked']).catch('all').parse(params.get('filter'));
  const page = Math.max(1, Math.min(10000, Number(params.get('page')) || 1));
  return NextResponse.json(
    {
      ...restrictionOptions(type.data, search, filter, Math.floor(page)),
      blockedCount: restrictionOptions(type.data, '', 'blocked', 1).total,
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}

export async function POST(request: NextRequest) {
  const denied = protectMutation(request);
  if (denied || !authorized(request)) {
    return denied ?? NextResponse.json({ error: 'OWNER_ONLY' }, { status: 403 });
  }
  try {
    const body: unknown = await request.json();
    if (body && typeof body === 'object' && 'action' in body && body.action === 'block_adult') {
      return NextResponse.json({ count: blockAdultCategories() });
    }
    const { type, targetId, blocked } = restriction.parse(body);
    return setRestriction(type, targetId, blocked)
      ? NextResponse.json({ ok: true })
      : NextResponse.json({ error: 'MEDIA_UNAVAILABLE' }, { status: 404 });
  } catch (error) {
    return failure(error);
  }
}
