import { defineConfig } from 'tsdown';

export default defineConfig({
	tsconfig: "tsconfig.app.json",
	entry: [
		'./src/**/*.test.ts',
		'./src/boot/entry.ts',
		'./src/config.ts',
		'./src/postgres.ts',
		'./src/server/api/openapi/gen-spec.ts',
	],
	deps: {
		neverBundle: ['@mapbox/node-pre-gyp', /^node:/],
	},
	format: 'esm',
	outDir: 'built',
	removeNodeProtocol: false,
	fixedExtension: false,
});
