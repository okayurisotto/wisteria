import { defineConfig } from 'tsup';

export default defineConfig({
	dts: process.env.NODE_ENV !== 'production',
	entry: ['./src/index.ts'],
	format: 'esm',
	outDir: 'built',
});
