import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { AddProviderModal } from '@/features/providers/add-provider-modal';
import { DemoButton } from '@/features/providers/demo-button';

export async function NoActiveSource() {
  const t = await getTranslations('Home');
  return (
    <div className="mx-auto flex min-h-[65vh] max-w-2xl flex-col items-start justify-center">
      <Image src="/brand/logo.svg" alt="Mosa" width={220} height={48} className="mb-10" />
      <span className="mb-3 text-sm font-semibold text-primary">{t('welcome')}</span>
      <h1 className="font-heading text-4xl font-bold">{t('noProvider')}</h1>
      <p className="mt-4 max-w-lg text-lg text-muted">{t('noProviderText')}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <AddProviderModal />
        <DemoButton />
      </div>
    </div>
  );
}
