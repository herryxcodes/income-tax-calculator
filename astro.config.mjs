// @ts-check
import { defineConfig } from 'astro/config';

import svelte from '@astrojs/svelte';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://calctax.ca',
  integrations: [svelte(), sitemap({ filter: (page) => !page.endsWith('/widget/') && !page.endsWith('/widget') })],

  vite: {
    plugins: [tailwindcss()]
  }
});
