import { defineConfig } from 'tsup';

export default defineConfig({
	tsconfig: "tsconfig.app.json",
	entry: ['./src/node.ts', './src/web.ts'],
	format: 'esm',
	keepNames: true,
	minify: true,
	outDir: 'built',
});
