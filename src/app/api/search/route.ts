import { NextRequest, NextResponse } from 'next/server';
import { globalSearch } from '@/features/catalog/queries';

export const runtime = 'nodejs';
export function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')?.trim().slice(0, 100) || '';
  const results = globalSearch(query);
  return NextResponse.json(
    Object.fromEntries(
      Object.entries(results).map(([type, rows]) => [
        type,
        rows.map(({ item }) => ({
          id: item.id,
          title: item.title,
          category: item.category,
          artwork: item.artwork,
        })),
      ]),
    ),
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
