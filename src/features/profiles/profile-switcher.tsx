'use client';

import { useRef, useState } from 'react';
import { Check, ChevronDown, Pencil, Plus, Trash2 } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useTranslations } from 'next-intl';
import { Tooltip } from '@/components/ui/tooltip';
import type { AvatarColor } from '@/features/profiles/service';

type ProfileSummary = { id: string; name: string; avatarColor: string; providerId: string | null };
const colors: Record<AvatarColor, string> = {
  blue: 'bg-blue-500',
  mint: 'bg-emerald-500',
  rose: 'bg-rose-500',
  amber: 'bg-amber-500',
  violet: 'bg-violet-500',
};

export function ProfileSwitcher({
  profiles,
  activeId,
  collapsed = false,
  owner,
}: {
  profiles: ProfileSummary[];
  activeId: string;
  collapsed?: boolean;
  owner: boolean;
}) {
  const t = useTranslations('Profiles');
  const dialog = useRef<HTMLDialogElement>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [avatarColor, setAvatarColor] = useState<AvatarColor>('blue');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const active = profiles.find((profile) => profile.id === activeId) ?? profiles[0];
  if (!active) {
    return null;
  }
  const avatar = (profile: ProfileSummary, size = 'h-9 w-9') => (
    <span
      aria-hidden="true"
      className={`inline-flex ${size} shrink-0 items-center justify-center rounded-xl font-heading font-bold text-white ${colors[profile.avatarColor as AvatarColor] ?? colors.blue}`}
    >
      {profile.name.trim().slice(0, 2).toLocaleUpperCase()}
    </span>
  );
  function openDialog(edit: boolean) {
    setEditing(edit);
    setName(edit ? active.name : '');
    setAvatarColor(
      edit && active.avatarColor in colors ? (active.avatarColor as AvatarColor) : 'blue',
    );
    setError('');
    queueMicrotask(() => dialog.current?.showModal());
  }
  async function switchProfile(id: string) {
    if (id === activeId) {
      return;
    }
    setBusy(true);
    try {
      const response = await fetch('/api/profiles/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) {
        throw new Error('Switch failed');
      }
      // A full navigation releases any persistent player from the previous profile.
      window.location.reload();
    } catch {
      setError(t('switchError'));
      setBusy(false);
    }
  }
  async function saveProfile() {
    setBusy(true);
    setError('');
    try {
      const response = await fetch(
        editing ? `/api/profiles/${encodeURIComponent(active.id)}` : '/api/profiles',
        {
          method: editing ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), avatarColor }),
        },
      );
      if (!response.ok) {
        throw new Error('Save failed');
      }
      window.location.reload();
    } catch {
      setError(t('saveError'));
      setBusy(false);
    }
  }
  async function deleteProfile() {
    if (!window.confirm(t('deleteConfirm'))) {
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`/api/profiles/${encodeURIComponent(active.id)}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Delete failed');
      }
      window.location.reload();
    } catch {
      setError(t('saveError'));
      setBusy(false);
    }
  }

  return (
    <>
      <DropdownMenu.Root>
        <Tooltip label={`${t('profile')}: ${active.name}`}>
          <DropdownMenu.Trigger
            disabled={!owner || busy}
            className={`flex w-full min-w-0 items-center gap-2 rounded-xl bg-elevated/70 p-2 text-left hover:bg-elevated focus-visible:ring-2 focus-visible:ring-primary ${collapsed ? 'justify-center' : ''}`}
            aria-label={`${t('profile')}: ${active.name}`}
          >
            {avatar(active)}
            {!collapsed && (
              <>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] uppercase text-muted">{t('profile')}</span>
                  <span className="block truncate text-sm font-semibold">{active.name}</span>
                </span>
                <ChevronDown size={16} className="shrink-0 text-muted" />
              </>
            )}
          </DropdownMenu.Trigger>
        </Tooltip>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="start"
            sideOffset={7}
            className="z-50 min-w-56 rounded-xl border border-border bg-elevated p-1.5 shadow-xl"
          >
            {profiles.map((profile) => (
              <DropdownMenu.Item
                key={profile.id}
                onSelect={() => void switchProfile(profile.id)}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm outline-none focus:bg-primary/15"
              >
                {avatar(profile, 'h-8 w-8')}
                <span className="flex-1 truncate">{profile.name}</span>
                {profile.id === activeId && <Check size={16} className="text-primary" />}
              </DropdownMenu.Item>
            ))}
            <DropdownMenu.Separator className="my-1 h-px bg-border" />
            <DropdownMenu.Item
              onSelect={() => openDialog(false)}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm outline-none focus:bg-primary/15"
            >
              <Plus size={16} />
              {t('create')}
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onSelect={() => openDialog(true)}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm outline-none focus:bg-primary/15"
            >
              <Pencil size={16} />
              {t('edit')}
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      <dialog
        ref={dialog}
        onClose={() => setError('')}
        className="m-auto w-[min(420px,calc(100vw-2rem))] rounded-2xl border border-border bg-surface p-6 text-foreground shadow-2xl backdrop:bg-black/75"
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void saveProfile();
          }}
          className="space-y-5"
        >
          <h2 className="font-heading text-xl font-semibold">
            {editing ? t('edit') : t('create')}
          </h2>
          <label className="block space-y-2 text-sm">
            {t('name')}
            <input
              autoFocus
              required
              maxLength={50}
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-foreground"
            />
          </label>
          <fieldset>
            <legend className="mb-2 text-sm">{t('color')}</legend>
            <div className="flex gap-2">
              {(Object.keys(colors) as AvatarColor[]).map((color) => (
                <button
                  type="button"
                  key={color}
                  onClick={() => setAvatarColor(color)}
                  aria-label={t(`colors.${color}`)}
                  aria-pressed={avatarColor === color}
                  className={`h-9 w-9 rounded-xl ${colors[color]} ${avatarColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-surface' : ''}`}
                />
              ))}
            </div>
          </fieldset>
          {error && (
            <p role="alert" className="text-sm text-error">
              {error}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              className="rounded-lg px-4 py-2 text-sm text-muted hover:bg-elevated"
            >
              {t('cancel')}
            </button>
            <button
              disabled={busy}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-background"
            >
              {t('save')}
            </button>
          </div>
          {editing && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void deleteProfile()}
              className="flex items-center gap-2 text-sm text-error"
            >
              <Trash2 size={16} />
              {t('delete')}
            </button>
          )}
        </form>
      </dialog>
    </>
  );
}
