import { defineConfig } from 'tsup';

export default defineConfig({
	entry: [
		'./src/**/*.test.ts',
		'./src/boot/entry.ts',
		'./src/config.ts',
		'./src/postgres.ts',
		'./src/server/api/openapi/gen-spec.ts',
	],
	external: ['@mapbox/node-pre-gyp', /^node:/],
	format: 'esm',
	minify: true,
	outDir: 'built',
});
