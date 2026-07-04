// @ts-check
import { defineConfig } from 'astro/config';

import vue from '@astrojs/vue';

import cloudflare from '@astrojs/cloudflare';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // SSR on every request so each day's data is always fresh.
  output: 'server',
  integrations: [vue()],
  adapter: cloudflare({ imageService: 'compile' }),
  vite: {
    plugins: [tailwindcss()],
  },
});