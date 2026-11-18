import { defineConfig } from 'tsdown';

export default defineConfig({
	platform: 'node',
	nodeProtocol: false,

	entry: [
		'src/**/*.test.ts',
		'src/boot/entry.ts',
		'src/config.ts',
		'src/postgres.ts',
		'src/server/api/openapi/gen-spec.ts',
	],
	outDir: 'built',

	format: 'esm',
	minify: true,
	fixedExtension: false,
	tsconfig: 'tsconfig.app.json',
});
