import { CatalogPage } from '@/components/media/catalog-page';
export const dynamic = 'force-dynamic';
export default function Page({ searchParams }: PageProps<'/[locale]/movies'>) {
  return <CatalogPage type="movie" searchParams={searchParams} />;
}
