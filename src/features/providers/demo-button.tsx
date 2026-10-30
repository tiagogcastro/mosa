'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
export function DemoButton() {
  const translations = useTranslations('Common');
  const router = useRouter();
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState('');

  return (
    <span className="inline-flex flex-col gap-2">
      <Button
        variant="secondary"
        disabled={isBusy}
        onClick={async () => {
          setIsBusy(true);
          setError('');

          try {
            const response = await fetch('/api/providers/demo', { method: 'POST' });
            if (!response.ok) {
              setError(translations('error'));
              return;
            }

            router.refresh();
          } catch {
            setError(translations('error'));
          } finally {
            setIsBusy(false);
          }
        }}
      >
        {isBusy ? translations('loading') : translations('demo')}
      </Button>
      {error && (
        <span role="alert" className="text-sm text-muted">
          {error}
        </span>
      )}
    </span>
  );
}
