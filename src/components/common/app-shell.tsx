'use client';

import Image from 'next/image';
import {
  Bookmark,
  PanelLeftClose,
  PanelLeftOpen,
  Clapperboard,
  Radio,
  Film,
  House,
  Search,
  Settings2,
  Tv,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Link, usePathname } from '@/i18n/navigation';
import { GlobalSearch } from '@/components/common/global-search';
import { Tooltip, TooltipProvider } from '@/components/ui/tooltip';

const links = [
  { href: '/', key: 'home', Icon: House },
  { href: '/live', key: 'live', Icon: Tv },
  { href: '/movies', key: 'movies', Icon: Clapperboard },
  { href: '/series', key: 'series', Icon: Film },
  { href: '/library', key: 'library', Icon: Bookmark },
] as const;

export function AppShell({
  children,
  initialCollapsed,
  providerName,
}: {
  children: React.ReactNode;
  initialCollapsed: boolean;
  providerName: string | null;
}) {
  const navigation = useTranslations('Navigation');
  const common = useTranslations('Common');
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
      }
    }
    document.addEventListener('keydown', shortcut);
    return () => document.removeEventListener('keydown', shortcut);
  }, []);
  async function toggleSidebar() {
    const next = !collapsed;
    setCollapsed(next);
    try {
      const response = await fetch('/api/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'sidebar_collapsed', value: String(next) }),
      });
      if (!response.ok) {
        setCollapsed(!next);
      }
    } catch {
      setCollapsed(!next);
    }
  }
  const itemClass = (selected: boolean) =>
    `relative flex h-12 w-full items-center gap-3 rounded-lg px-[18px] text-sm transition-colors ${selected ? 'bg-elevated font-semibold text-primary before:absolute before:inset-y-3 before:left-0 before:w-[3px] before:rounded-full before:bg-primary' : 'text-muted hover:bg-elevated/70 hover:text-foreground'}`;
  return (
    <TooltipProvider>
      <div className={`min-h-dvh ${collapsed ? 'md:pl-[68px]' : 'md:pl-56'}`}>
        <aside
          className={`fixed inset-y-0 left-0 z-30 hidden flex-col bg-sidebar md:flex ${collapsed ? 'w-[68px]' : 'w-56'}`}
        >
          <div className="flex h-20 items-center justify-between gap-1 px-[18px]">
            <Link href="/" className="flex min-w-0 items-center gap-3" aria-label="Mosa">
              <Image src="/brand/symbol.svg" alt="" width={32} height={32} className="shrink-0" />
              {!collapsed && (
                <span className="truncate font-heading text-[22px] font-semibold tracking-tight">
                  mosa
                </span>
              )}
            </Link>
            <Tooltip label={collapsed ? navigation('expand') : navigation('collapse')}>
              <button
                onClick={() => void toggleSidebar()}
                aria-label={collapsed ? navigation('expand') : navigation('collapse')}
                className={`rounded-md p-1.5 text-muted hover:bg-elevated hover:text-foreground ${collapsed ? 'absolute left-[48px] top-[26px] z-10 bg-sidebar p-1' : ''}`}
              >
                {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={17} />}
              </button>
            </Tooltip>
          </div>
          <nav aria-label={navigation('brand')} className="grid gap-1 px-2">
            {links.map(({ href, key, Icon }) => (
              <Tooltip key={href} label={navigation(key)}>
                <Link
                  href={href}
                  aria-current={pathname === href ? 'page' : undefined}
                  aria-label={navigation(key)}
                  className={itemClass(pathname === href)}
                >
                  <Icon size={20} strokeWidth={1.9} className="shrink-0" />
                  {!collapsed && <span className="truncate">{navigation(key)}</span>}
                </Link>
              </Tooltip>
            ))}
            <Tooltip label={common('search')}>
              <button
                onClick={() => setSearchOpen(true)}
                aria-label={common('search')}
                className={itemClass(false)}
              >
                <Search size={20} strokeWidth={1.9} className="shrink-0" />
                {!collapsed && <span>{common('search')}</span>}
              </button>
            </Tooltip>
          </nav>
          <div className="mt-auto space-y-1 px-2 pb-5">
            {!collapsed && providerName && (
              <Link
                href="/settings"
                aria-label={`${navigation('provider')}: ${providerName}`}
                className="mx-1 mb-2 flex items-center gap-3 rounded-xl bg-elevated/70 px-3 py-3 hover:bg-elevated"
              >
                <Radio size={17} className="shrink-0 text-primary" />
                <span className="min-w-0">
                  <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted">
                    {navigation('provider')}
                  </span>
                  <span className="block truncate text-sm font-semibold text-foreground">
                    {providerName}
                  </span>
                </span>
              </Link>
            )}
            <Tooltip label={navigation('settings')}>
              <Link
                href="/settings"
                aria-label={navigation('settings')}
                aria-current={pathname === '/settings' ? 'page' : undefined}
                className={itemClass(pathname === '/settings')}
              >
                <Settings2 size={20} strokeWidth={1.9} className="shrink-0" />
                {!collapsed && <span>{navigation('settings')}</span>}
              </Link>
            </Tooltip>
          </div>
        </aside>
        <main
          className={`mx-auto min-w-0 max-w-[1800px] px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-7 md:px-8 md:pb-10 ${pathname === '/live' || pathname === '/settings' ? 'lg:h-dvh lg:overflow-hidden' : 'min-h-dvh'}`}
        >
          <div className="mb-6 flex items-center justify-between md:hidden">
            <Link href="/" aria-label="Mosa" className="flex items-center gap-2">
              <Image src="/brand/symbol.svg" alt="" width={28} height={28} />
              <span className="font-heading text-lg font-semibold">mosa</span>
            </Link>
            <button
              onClick={() => setSearchOpen(true)}
              aria-label={common('search')}
              className="rounded-lg p-2 text-muted"
            >
              <Search size={22} />
            </button>
          </div>
          {children}
        </main>
        <nav
          aria-label={navigation('brand')}
          className="fixed inset-x-0 bottom-0 z-30 flex min-h-16 items-center justify-around border-t border-border bg-sidebar pb-[env(safe-area-inset-bottom)] md:hidden"
        >
          {links.map(({ href, key, Icon }) => (
            <Link
              href={href}
              key={href}
              aria-current={pathname === href ? 'page' : undefined}
              className={`flex min-h-12 min-w-12 flex-col items-center justify-center gap-1 text-[11px] ${pathname === href ? 'font-semibold text-primary' : 'text-muted'}`}
            >
              <Icon size={20} strokeWidth={1.9} />
              {navigation(key)}
            </Link>
          ))}
        </nav>
        {searchOpen && <GlobalSearch close={() => setSearchOpen(false)} />}
      </div>
    </TooltipProvider>
  );
}
