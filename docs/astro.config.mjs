import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  // Site title shown in Starlight UI; change when ready
  title: 'Weather Starter Docs',
  integrations: [starlight()],
});
