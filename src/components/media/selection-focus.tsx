'use client';

import { useEffect } from 'react';

export function SelectionFocus({ selectedId }: { selectedId: string | null }) {
  useEffect(() => {
    if (!selectedId) {
      return;
    }
    const container = document.getElementById('catalog-content');
    container?.scrollTo({ top: 0, behavior: 'instant' });
    container?.querySelector<HTMLElement>('#selection h1')?.focus({ preventScroll: true });
  }, [selectedId]);
  return null;
}
