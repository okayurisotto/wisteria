import { defineConfig } from 'tsdown';

export default defineConfig({
	tsconfig: "tsconfig.app.json",
	entry: ['./src/node.ts', './src/web.ts'],
	format: 'esm',
	minify: true,
	outDir: 'built',
	fixedExtension: false,
});
