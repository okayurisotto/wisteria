import { defineConfig } from 'tsdown';

export default defineConfig({
	tsconfig: "tsconfig.app.json",
	entry: ['./src/index.ts'],
	format: 'esm',
	outDir: 'built',
	fixedExtension: false,
});
