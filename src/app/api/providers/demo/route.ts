import { NextRequest, NextResponse } from 'next/server';
import { installDemo } from '@/features/providers/demo';
import { failure, protectMutation } from '@/lib/security/request';
export const runtime = 'nodejs';
export function POST(request: NextRequest) {
  const denied = protectMutation(request);
  if (denied) {
    return denied;
  }
  try {
    installDemo();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
