import { AppShell } from '@/components/common/app-shell';
export default function Layout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
