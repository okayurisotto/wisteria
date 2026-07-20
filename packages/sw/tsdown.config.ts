import { defineConfig } from 'tsdown';
import meta from '../../package.json' with { type: 'json' };

export default defineConfig({
	tsconfig: "tsconfig.app.json",
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
	fixedExtension: false,
});
