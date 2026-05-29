// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
	site: 'https://ffm.newworkdesignlab.org',
	output: 'server',
	adapter: vercel({ imageService: false }),
	server: { host: 'localhost', port: 4321 },
});

