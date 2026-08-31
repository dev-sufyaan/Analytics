import type { MetadataRoute } from 'next';
import { SITE_CONFIG } from '../lib/seo/seo-config';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Analytics',
    short_name: 'Analytics',
    description: SITE_CONFIG.defaultDescription,
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#010120',
    icons: [
      {
        src: '/icon.png',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        src: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
      {
        src: '/logo.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/logo.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
