import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import cloudflare from '@astrojs/cloudflare';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';

// Русская версия: на Vercel (там при сборке есть переменная VERCEL=1)
// сайт собирается адаптером Vercel, в остальных случаях — как в оригинале,
// под Cloudflare Pages.
const onVercel = Boolean(process.env.VERCEL);

export default defineConfig({
  site: process.env.SITE_URL || 'https://www.aitmpl.com',
  output: 'server',
  adapter: onVercel ? vercel() : cloudflare({ mode: 'directory' }),
  integrations: [react()],
  vite: {
    plugins: [
      tailwindcss(),
      {
        name: 'cloudflare-react-dom-server',
        config(_config, { command }) {
          // Подмена react-dom/server нужна только рантайму Cloudflare.
          if (command === 'build' && !onVercel) {
            return {
              resolve: {
                alias: [
                  { find: /^react-dom\/server$/, replacement: 'react-dom/server.node' },
                ],
              },
              ssr: { noExternal: ['react-dom'] },
            };
          }
        },
      },
    ],
    resolve: {
      dedupe: ['react', 'react-dom'],
    },
    ssr: {
      external: ['node:fs', 'node:path', 'node:url', 'node:stream'],
    },
  },
});
