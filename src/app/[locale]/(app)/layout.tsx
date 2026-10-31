import { AppShell } from '@/components/common/app-shell';
import { preference } from '@/features/settings/preferences';
import { cookies } from 'next/headers';
import { authEnabled, cookieName, roleFor } from '@/features/auth/service';
import { activeProfile, allProfiles } from '@/features/profiles/service';

export default async function Layout({ children }: { children: React.ReactNode }) {
  const profile = activeProfile();
  return (
    <AppShell
      initialCollapsed={preference('sidebar_collapsed') === 'true'}
      profiles={allProfiles()}
      activeProfileId={profile.id}
      profileOwner={!authEnabled() || roleFor((await cookies()).get(cookieName)?.value) === 'owner'}
    >
      {children}
    </AppShell>
  );
}
