import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Mosa',
    short_name: 'Mosa',
    description: 'Seu catálogo pessoal de TV e vídeos.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0c111a',
    theme_color: '#0c111a',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
