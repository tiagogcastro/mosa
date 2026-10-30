import type { Metadata } from 'next';
import { DM_Sans, Plus_Jakarta_Sans } from 'next/font/google';
import '@/app/globals.css';

const bodyFont = DM_Sans({
  variable: '--font-body',
  subsets: ['latin'],
});

const headingFont = Plus_Jakarta_Sans({
  variable: '--font-heading',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Mosa',
  description: 'Your content. Your way.',
  icons: { icon: '/brand/favicon.svg' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${bodyFont.variable} ${headingFont.variable}`}>
      <body>{children}</body>
    </html>
  );
}
