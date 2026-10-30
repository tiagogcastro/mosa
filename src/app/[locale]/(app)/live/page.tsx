import { CatalogPage } from '@/components/media/catalog-page';
export const dynamic = 'force-dynamic';
export default function Page({ searchParams }: PageProps<'/[locale]/live'>) {
  return <CatalogPage type="live" searchParams={searchParams} />;
}
