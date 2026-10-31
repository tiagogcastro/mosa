import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authEnabled, roleForRequest } from '@/features/auth/service';
import {
  activeProfile,
  allProfiles,
  avatarColors,
  createProfile,
} from '@/features/profiles/service';
import { failure, protectMutation } from '@/lib/security/request';

export const runtime = 'nodejs';
const schema = z.object({
  name: z.string().trim().min(1).max(50),
  avatarColor: z.enum(avatarColors),
});

export function GET(request: NextRequest) {
  if (authEnabled() && roleForRequest(request) !== 'owner') {
    return NextResponse.json({ error: 'OWNER_ONLY' }, { status: 403 });
  }
  return NextResponse.json(
    { activeId: activeProfile().id, profiles: allProfiles() },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}

export async function POST(request: NextRequest) {
  const denied = protectMutation(request);
  if (denied || (authEnabled() && roleForRequest(request) !== 'owner')) {
    return denied ?? NextResponse.json({ error: 'OWNER_ONLY' }, { status: 403 });
  }
  try {
    const { name, avatarColor } = schema.parse(await request.json());
    return NextResponse.json({ id: createProfile(name, avatarColor) }, { status: 201 });
  } catch (error) {
    return failure(error);
  }
}
