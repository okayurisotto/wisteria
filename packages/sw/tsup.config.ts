import { defineConfig } from 'tsup';
import meta from '../../package.json' assert { type: 'json' };

export default defineConfig({
	bundle: true,
	entry: ['./src/sw.ts'],
	format: 'esm',
	minify: true,
	outDir: '../../built/_sw_dist_',
	define: {
		_DEV_: JSON.stringify(process.env.NODE_ENV !== 'production'),
		_VERSION_: JSON.stringify(meta.version),
	},
});
