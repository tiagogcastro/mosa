'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Tooltip } from '@/components/ui/tooltip';

export function PasswordEditor({
  providerId,
  fieldClass,
}: {
  providerId: string;
  fieldClass: string;
}) {
  const t = useTranslations('Settings');
  const providers = useTranslations('Providers');
  const [value, setValue] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function toggle() {
    if (visible) {
      setVisible(false);
      return;
    }
    if (!value) {
      setBusy(true);
      setError('');
      try {
        const response = await fetch(`/api/providers/${encodeURIComponent(providerId)}/password`, {
          cache: 'no-store',
        });
        if (!response.ok) {
          throw new Error('Could not load password');
        }
        const result: { password: string } = await response.json();
        setValue(result.password);
      } catch {
        setError(t('revealFailed'));
        setBusy(false);
        return;
      }
      setBusy(false);
    }
    setVisible(true);
  }

  return (
    <label className="block text-sm">
      {providers('password')}
      <span className="relative block">
        <input
          name="password"
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          autoComplete="new-password"
          placeholder={t('unchanged')}
          className={`${fieldClass} pr-12`}
        />
        <Tooltip label={visible ? t('hidePassword') : t('showPassword')}>
          <button
            type="button"
            disabled={busy}
            onClick={() => void toggle()}
            aria-label={visible ? t('hidePassword') : t('showPassword')}
            className="absolute inset-y-0 right-1 flex w-10 items-center justify-center text-muted hover:text-primary focus-visible:outline-2 focus-visible:outline-primary"
          >
            {visible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </Tooltip>
      </span>
      <span className="text-xs text-muted">{t('passwordSafety')}</span>
      {error && (
        <span role="alert" className="block text-xs text-error">
          {error}
        </span>
      )}
    </label>
  );
}
