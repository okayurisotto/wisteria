import { defineConfig } from 'tsdown';
import meta from '../../package.json' with { type: 'json' };

export default defineConfig({
	platform: 'browser',

	entry: [
		'src/sw.ts',
	],
	outDir: 'built',

	format: 'iife',
	minify: true,
	fixedExtension: false,
	tsconfig: 'tsconfig.app.json',
	dts: false,
	define: {
		_DEV_: JSON.stringify(process.env['NODE_ENV'] !== 'production'),
		_VERSION_: JSON.stringify(meta.version),
	},
});
