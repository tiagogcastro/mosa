'use client';

import { useEffect, useRef } from 'react';
import { LayoutGrid } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Tooltip } from '@/components/ui/tooltip';
import { categoryPresentation } from '@/features/live/category';

export function CatalogCategories({
  type,
  selected,
  categories,
  query,
  sort,
}: {
  type: 'movies' | 'series';
  selected: string;
  categories: { name: string; count: number }[];
  query: string;
  sort: string;
}) {
  const t = useTranslations('Catalog');
  const list = useRef<HTMLElement>(null);
  useEffect(() => {
    try {
      if (list.current) {
        list.current.scrollTop = Number(sessionStorage.getItem(`mosa-categories-${type}`)) || 0;
      }
    } catch {
      // Storage can be disabled by the browser.
    }
  }, [type]);
  return (
    <nav
      ref={list}
      aria-label={t('allCategories')}
      onScroll={(event) => {
        try {
          sessionStorage.setItem(`mosa-categories-${type}`, String(event.currentTarget.scrollTop));
        } catch {
          /* Optional scroll memory. */
        }
      }}
      className="flex min-w-0 gap-2 overflow-x-auto pb-2 lg:min-h-0 lg:flex-col lg:overflow-x-hidden lg:overflow-y-auto lg:overscroll-contain lg:pr-2"
    >
      {[
        { name: '', count: categories.reduce((sum, row) => sum + row.count, 0) },
        ...categories,
      ].map(({ name, count }) => {
        const { name: label, Icon } = name
          ? categoryPresentation(name)
          : { name: t('allCategories'), Icon: LayoutGrid };
        const params = new URLSearchParams();
        if (query) {
          params.set('q', query);
        }
        if (name) {
          params.set('category', name);
        }
        params.set('sort', sort);
        return (
          <Tooltip key={name} label={label}>
            <Link
              href={`/${type}?${params}`}
              aria-current={selected === name ? 'page' : undefined}
              className={`flex min-w-0 shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-[15px] lg:w-full ${selected === name ? 'bg-elevated font-semibold text-primary ring-1 ring-primary/30' : 'text-muted hover:bg-elevated hover:text-foreground'}`}
            >
              <Icon size={17} className="shrink-0" />
              <span className="min-w-0 flex-1 truncate">{label}</span>
              <span className="shrink-0 text-xs tabular-nums opacity-65">{count}</span>
            </Link>
          </Tooltip>
        );
      })}
    </nav>
  );
}
