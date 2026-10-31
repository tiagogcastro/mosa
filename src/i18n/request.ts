import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { routing } from '@/i18n/routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  const sections = [
    'common',
    'navigation',
    'home',
    'catalog',
    'providers',
    'player',
    'settings',
    'auth',
  ];
  const messages: Record<string, unknown> = {};
  for (const section of sections) {
    Object.assign(messages, (await import(`./messages/${locale}/${section}.json`)).default);
  }
  return { locale, messages };
});
