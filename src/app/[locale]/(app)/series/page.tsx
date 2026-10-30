import { CatalogPage } from '@/components/media/catalog-page';
export const dynamic = 'force-dynamic';
export default function Page({ searchParams }: PageProps<'/[locale]/series'>) {
  return <CatalogPage type="series" searchParams={searchParams} />;
}
