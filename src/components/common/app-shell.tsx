'use client';
import Image from 'next/image';
import { Clapperboard, Heart, House, MonitorPlay, Search, Settings, Tv } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Link, usePathname } from '@/i18n/navigation';
import { GlobalSearch } from '@/components/common/global-search';

const links = [
  { href: '/', key: 'home', Icon: House },
  { href: '/live', key: 'live', Icon: Tv },
  { href: '/movies', key: 'movies', Icon: Clapperboard },
  { href: '/series', key: 'series', Icon: MonitorPlay },
  { href: '/library', key: 'library', Icon: Heart },
] as const;
export function AppShell({ children }: { children: React.ReactNode }) {
  const navigationTranslations = useTranslations('Navigation');
  const commonTranslations = useTranslations('Common');
  const pathname = usePathname();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  return (
    <div className="min-h-screen md:pl-[68px] lg:pl-[216px]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[68px] flex-col border-r border-border bg-surface md:flex lg:w-[216px]">
        <Link href="/" className="flex h-16 items-center gap-3 px-5" aria-label="Mosa">
          <Image src="/brand/symbol.svg" alt="" width={32} height={32} />
          <span className="hidden font-heading text-xl font-bold lg:block">mosa</span>
        </Link>
        <nav aria-label={navigationTranslations('brand')} className="mt-8 grid gap-1 px-2">
          {links.map(({ href, key, Icon }) => (
            <Link
              key={href}
              href={href}
              title={navigationTranslations(key)}
              aria-current={pathname === href ? 'page' : undefined}
              className={`flex h-11 items-center gap-3 rounded-lg px-3 text-sm ${pathname === href ? 'bg-elevated font-semibold text-primary' : 'text-muted hover:bg-elevated hover:text-foreground'}`}
            >
              <Icon size={19} />
              <span className="hidden lg:block">{navigationTranslations(key)}</span>
            </Link>
          ))}
        </nav>
        <Link
          href="/settings"
          title={navigationTranslations('settings')}
          className="mt-auto mb-5 flex h-11 items-center gap-3 rounded-lg px-5 text-sm text-muted hover:text-foreground"
        >
          <Settings size={19} />
          <span className="hidden lg:block">{navigationTranslations('settings')}</span>
        </Link>
      </aside>
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur-sm md:px-8">
        <Link href="/" className="flex items-center gap-2 md:hidden">
          <Image src="/brand/symbol.svg" alt="" width={28} height={28} />
          <span className="font-heading text-lg font-bold">mosa</span>
        </Link>
        <span className="hidden text-sm text-muted md:block">
          {navigationTranslations('brand')}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            aria-label={commonTranslations('search')}
            className="rounded-lg p-2 text-muted hover:bg-elevated"
          >
            <Search size={20} />
          </button>
          <Link
            href="/connect"
            className="hidden rounded-lg border border-border px-3 py-2 text-sm text-muted hover:text-foreground sm:block"
          >
            {navigationTranslations('connect')}
          </Link>
          <Link
            href="/settings"
            aria-label={navigationTranslations('settings')}
            className="rounded-lg p-2 text-muted hover:text-foreground md:hidden"
          >
            <Settings size={20} />
          </Link>
        </div>
      </header>
      {isSearchOpen && <GlobalSearch close={() => setIsSearchOpen(false)} />}
      <main className="mx-auto min-h-[calc(100vh-64px)] max-w-[1600px] px-4 pb-28 pt-8 md:px-8 md:pb-12">
        {children}
      </main>
      <nav
        aria-label={navigationTranslations('brand')}
        className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-center justify-around border-t border-border bg-surface md:hidden"
      >
        {links.map(({ href, key, Icon }) => (
          <Link
            href={href}
            key={href}
            aria-current={pathname === href ? 'page' : undefined}
            className={`flex min-w-12 flex-col items-center gap-1 text-[10px] ${pathname === href ? 'font-bold text-primary' : 'text-muted'}`}
          >
            <Icon size={21} />
            {navigationTranslations(key)}
          </Link>
        ))}
      </nav>
    </div>
  );
}
