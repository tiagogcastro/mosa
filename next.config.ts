import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3'],
};

export default createNextIntlPlugin()(nextConfig);
