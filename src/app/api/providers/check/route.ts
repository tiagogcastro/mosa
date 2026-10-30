import { NextRequest, NextResponse } from 'next/server';
import { connectionSchema, inspectConnection } from '@/features/providers/service';
import { failure, protectMutation } from '@/lib/security/request';
export const runtime = 'nodejs';
export async function POST(request: NextRequest) {
  const denied = protectMutation(request);
  if (denied) {
    return denied;
  }
  try {
    return NextResponse.json(await inspectConnection(connectionSchema.parse(await request.json())));
  } catch (error) {
    return failure(error);
  }
}
