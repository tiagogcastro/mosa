import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { providers } from '@/db/schema';
import { connectionSchema, importConnection } from '@/features/providers/service';
import { activeProviderId } from '@/features/providers/active';
import { failure, protectMutation } from '@/lib/security/request';
export const runtime = 'nodejs';
export function GET() {
  return NextResponse.json({
    activeId: activeProviderId(),
    providers: db
      .select({
        id: providers.id,
        name: providers.name,
        type: providers.type,
        enabled: providers.enabled,
        syncedAt: providers.syncedAt,
      })
      .from(providers)
      .all(),
  });
}
export async function POST(request: NextRequest) {
  const denied = protectMutation(request);
  if (denied) {
    return denied;
  }
  try {
    return NextResponse.json(await importConnection(connectionSchema.parse(await request.json())));
  } catch (error) {
    return failure(error);
  }
}
