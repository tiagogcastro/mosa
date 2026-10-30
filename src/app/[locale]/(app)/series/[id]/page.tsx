import { DetailPage } from '@/components/media/detail-page';
export const dynamic = 'force-dynamic';
export default async function Page({ params, searchParams }: PageProps<'/[locale]/series/[id]'>) {
  const { id } = await params;
  const { from } = await searchParams;
  return (
    <DetailPage
      id={decodeURIComponent(id)}
      type="series"
      from={typeof from === 'string' ? from : undefined}
    />
  );
}
