import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authEnabled, roleForRequest } from '@/features/auth/service';
import { avatarColors, removeProfile, updateProfile } from '@/features/profiles/service';
import { failure, protectMutation } from '@/lib/security/request';

export const runtime = 'nodejs';
const schema = z.object({
  name: z.string().trim().min(1).max(50),
  avatarColor: z.enum(avatarColors),
});
function authorize(request: NextRequest) {
  return (
    protectMutation(request) ??
    (authEnabled() && roleForRequest(request) !== 'owner'
      ? NextResponse.json({ error: 'OWNER_ONLY' }, { status: 403 })
      : null)
  );
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = authorize(request);
  if (denied) {
    return denied;
  }
  try {
    const { id } = await params;
    const { name, avatarColor } = schema.parse(await request.json());
    return updateProfile(id, name, avatarColor)
      ? NextResponse.json({ ok: true })
      : NextResponse.json({ error: 'PROFILE_NOT_FOUND' }, { status: 404 });
  } catch (error) {
    return failure(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = authorize(request);
  if (denied) {
    return denied;
  }
  const { id } = await params;
  return removeProfile(id)
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: 'PROFILE_NOT_FOUND' }, { status: 404 });
}
