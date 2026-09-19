import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Margin — Video reading library',
    short_name: 'Margin',
    description: 'Turn video transcripts into a personal, annotatable reading library.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#121715',
    theme_color: '#1b6d56',
    orientation: 'any',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
