import { defineConfig } from 'tsup';
import meta from '../../package.json' assert { type: 'json' };

export default defineConfig({
	bundle: true,
	entry: ['./src/sw.ts'],
	format: 'iife',
	minify: true,
	outDir: 'built',
	outExtension: () => ({ js: '.js' }),
	define: {
		_DEV_: JSON.stringify(process.env.NODE_ENV !== 'production'),
		_VERSION_: JSON.stringify(meta.version),
	},
});
