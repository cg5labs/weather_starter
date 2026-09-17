import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import mermaid from 'astro-mermaid';

export default defineConfig({
  // Site title shown in Starlight UI; change when ready
  title: 'Weather Starter Docs',
  integrations: [
    mermaid(),
    starlight({ title: 'Weather Starter Docs' }),
  ],
});
