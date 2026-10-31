'use client';

import { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';

export function CatalogSearch({
  section,
  category,
  sort,
  initial,
  label,
  sortLabel,
  recentLabel,
  alphaLabel,
}: {
  section: 'movies' | 'series';
  category: string;
  sort: string;
  initial: string;
  label: string;
  sortLabel: string;
  recentLabel: string;
  alphaLabel: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    },
    [],
  );
  function navigate(next: string, order: string) {
    const params = new URLSearchParams();
    if (next.trim()) {
      params.set('q', next.trim());
    }
    if (category) {
      params.set('category', category);
    }
    params.set('sort', order);
    router.replace(`/${section}?${params}`);
  }
  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:justify-end">
      <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-surface px-3 focus-within:border-primary sm:max-w-80">
        <Search size={17} className="shrink-0 text-muted" />
        <input
          value={value}
          onChange={(event) => {
            const next = event.target.value;
            setValue(next);
            if (timer.current) {
              clearTimeout(timer.current);
            }
            timer.current = setTimeout(() => navigate(next, sort), 350);
          }}
          placeholder={label}
          aria-label={label}
          className="h-11 min-w-0 w-full bg-transparent text-sm text-foreground"
        />
      </label>
      <select
        value={sort}
        aria-label={sortLabel}
        className="h-11 rounded-lg border border-border bg-surface px-3 text-sm text-foreground"
        onChange={(event) => {
          if (timer.current) {
            clearTimeout(timer.current);
          }
          navigate(value, event.target.value);
        }}
      >
        <option value="recent">{recentLabel}</option>
        <option value="alpha">{alphaLabel}</option>
      </select>
    </div>
  );
}
