'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';

export function MediaRail({
  children,
  label,
  previous,
  next,
}: {
  children: React.ReactNode;
  label: string;
  previous: string;
  next: string;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });
  const update = useCallback(() => {
    const element = scroller.current;
    if (element) {
      setEdges({
        start: element.scrollLeft <= 2,
        end: element.scrollLeft + element.clientWidth >= element.scrollWidth - 2,
      });
    }
  }, []);
  useEffect(() => {
    const element = scroller.current;
    if (!element) {
      return;
    }
    const observer = new ResizeObserver(update);
    observer.observe(element);
    for (const child of element.children) {
      observer.observe(child);
    }
    update();
    return () => observer.disconnect();
  }, [update]);
  function scroll(direction: -1 | 1) {
    const element = scroller.current;
    if (element) {
      element.scrollBy({
        left: direction * Math.max(180, element.clientWidth * 0.75),
        behavior: 'smooth',
      });
    }
  }
  return (
    <div className="relative min-w-0">
      <div className="absolute -top-12 right-0 flex gap-1">
        <button
          type="button"
          disabled={edges.start}
          onClick={() => scroll(-1)}
          aria-label={`${label}: ${previous}`}
          className="rounded-full border border-border bg-surface p-2 text-muted transition-colors hover:border-primary hover:text-primary disabled:cursor-default disabled:opacity-35"
        >
          <ArrowLeft size={16} />
        </button>
        <button
          type="button"
          disabled={edges.end}
          onClick={() => scroll(1)}
          aria-label={`${label}: ${next}`}
          className="rounded-full border border-border bg-surface p-2 text-muted transition-colors hover:border-primary hover:text-primary disabled:cursor-default disabled:opacity-35"
        >
          <ArrowRight size={16} />
        </button>
      </div>
      <div
        ref={scroller}
        onScroll={update}
        className="media-rail flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-4"
      >
        {children}
      </div>
    </div>
  );
}
