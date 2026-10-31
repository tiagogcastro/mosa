import { AppShell } from '@/components/common/app-shell';
import { preference } from '@/features/settings/preferences';
import { activeProviderId } from '@/features/providers/active';
import { db } from '@/db/client';
import { providers } from '@/db/schema';
import { eq } from 'drizzle-orm';
export default function Layout({ children }: { children: React.ReactNode }) {
  const id = activeProviderId();
  const name = id
    ? db.select({ name: providers.name }).from(providers).where(eq(providers.id, id)).get()?.name
    : null;
  return (
    <AppShell
      initialCollapsed={preference('sidebar_collapsed') === 'true'}
      providerName={name ?? null}
    >
      {children}
    </AppShell>
  );
}
