import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import type { Metadata } from 'next';
import { Inter, Outfit } from 'next/font/google';
import '@/app/globals.css';
import { preference } from '@/features/settings/preferences';

const bodyFont = Inter({ variable: '--font-body', subsets: ['latin'] });
const headingFont = Outfit({ variable: '--font-heading', subsets: ['latin'] });
export const metadata: Metadata = {
  title: 'Mosa',
  description: 'Your content. Your way.',
  icons: { icon: '/brand/favicon.svg' },
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Mosa' },
};
export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#0c111a' };

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
    <html
      data-theme={preference('theme', 'dark')}
      lang={locale}
      className={`${bodyFont.variable} ${headingFont.variable}`}
    >
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
