import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authEnabled, roleForRequest } from '@/features/auth/service';
import { reviewProvisioning } from '@/features/providers/provisioning';
import { failure, protectMutation } from '@/lib/security/request';

export const runtime = 'nodejs';
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = protectMutation(request);
  if (denied || (authEnabled() && roleForRequest(request) !== 'owner')) {
    return denied ?? NextResponse.json({ error: 'OWNER_ONLY' }, { status: 403 });
  }
  try {
    const { id } = await params;
    const { action, replace } = z
      .object({ action: z.enum(['approve', 'reject']), replace: z.boolean().default(false) })
      .parse(await request.json());
    const result = await reviewProvisioning(id, action, replace);
    return result.success
      ? NextResponse.json(result)
      : NextResponse.json(
          { error: result.code },
          { status: result.code === 'REPLACEMENT_REQUIRED' ? 409 : 400 },
        );
  } catch (error) {
    return failure(error);
  }
}
