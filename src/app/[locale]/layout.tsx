import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import type { Metadata } from 'next';
import { DM_Sans, Plus_Jakarta_Sans } from 'next/font/google';
import '@/app/globals.css';

const bodyFont = DM_Sans({ variable: '--font-body', subsets: ['latin'] });
const headingFont = Plus_Jakarta_Sans({ variable: '--font-heading', subsets: ['latin'] });
export const metadata: Metadata = {
  title: 'Mosa',
  description: 'Your content. Your way.',
  icons: { icon: '/brand/favicon.svg' },
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: LayoutProps<'/[locale]'>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);
  return (
    <html lang={locale} className={`${bodyFont.variable} ${headingFont.variable}`}>
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
