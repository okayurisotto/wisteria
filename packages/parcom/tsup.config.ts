import { defineConfig } from 'tsup';

export default defineConfig({
	tsconfig: "tsconfig.app.json",
	entry: ['./src/index.ts'],
	format: 'esm',
	outDir: 'built',
});
