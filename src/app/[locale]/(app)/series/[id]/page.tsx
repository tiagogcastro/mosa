import { DetailPage } from '@/components/media/detail-page';
export const dynamic = 'force-dynamic';
export default async function Page({ params }: PageProps<'/[locale]/series/[id]'>) {
  const { id } = await params;
  return <DetailPage id={id} type="series" />;
}
