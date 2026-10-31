import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { activeProviderId, selectActiveProvider } from '@/features/providers/active';
import { failure, protectMutation } from '@/lib/security/request';

export const runtime = 'nodejs';
export function GET() {
  return NextResponse.json(
    { id: activeProviderId() },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
export async function POST(request: NextRequest) {
  const denied = protectMutation(request);
  if (denied) {
    return denied;
  }
  try {
    const { id } = z.object({ id: z.string().min(1) }).parse(await request.json());
    if (!selectActiveProvider(id)) {
      return NextResponse.json({ error: 'PROVIDER_UNAVAILABLE' }, { status: 404 });
    }
    return NextResponse.json({ id });
  } catch (error) {
    return failure(error);
  }
}
