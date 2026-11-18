import { defineConfig } from 'tsdown';

export default defineConfig({
	platform: 'node',
	nodeProtocol: false,

	entry: [
		'src/index.ts',
	],
	outDir: 'built',

	format: 'esm',
	minify: true,
	fixedExtension: false,
	tsconfig: 'tsconfig.app.json',
});
