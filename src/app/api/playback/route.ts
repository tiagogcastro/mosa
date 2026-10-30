import { NextRequest, NextResponse } from 'next/server';
import { resolveSource } from '@/features/providers/service';
import { failure } from '@/lib/security/request';
export const runtime = 'nodejs';
export function GET(request: NextRequest) {
  try {
    const mediaId = request.nextUrl.searchParams.get('id');
    if (!mediaId) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT' } },
        { status: 400 },
      );
    }

    const result = resolveSource(mediaId);
    if (!result.success) {
      return NextResponse.json({ success: false, error: { code: result.error } }, { status: 404 });
    }

    return NextResponse.json(result.data, {
      headers: { 'Cache-Control': 'no-store, private' },
    });
  } catch (error) {
    return failure(error);
  }
}
