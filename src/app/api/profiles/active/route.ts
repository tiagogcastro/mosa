import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authEnabled, roleForRequest } from '@/features/auth/service';
import { setActiveProfile } from '@/features/profiles/service';
import { failure, protectMutation } from '@/lib/security/request';

export const runtime = 'nodejs';
export async function POST(request: NextRequest) {
  const denied = protectMutation(request);
  if (denied || (authEnabled() && roleForRequest(request) !== 'owner')) {
    return denied ?? NextResponse.json({ error: 'OWNER_ONLY' }, { status: 403 });
  }
  try {
    const { id } = z.object({ id: z.string().min(1) }).parse(await request.json());
    return setActiveProfile(id)
      ? NextResponse.json({ id })
      : NextResponse.json({ error: 'PROFILE_NOT_FOUND' }, { status: 404 });
  } catch (error) {
    return failure(error);
  }
}
