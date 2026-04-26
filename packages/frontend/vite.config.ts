import * as crypto from 'node:crypto';
import path from 'node:path';
import pluginVue from '@vitejs/plugin-vue';
import { type UserConfig, defineConfig } from 'vite';

import { languages } from 'locales';
import meta from '../../package.json';
import pluginUnwindCssModuleClassName from './lib/rollup-plugin-unwind-css-module-class-name.js';

const extensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.json', '.json5', '.svg', '.sass', '.scss', '.css', '.vue'];

export const baseConfig: UserConfig = {
	base: '/vite/',

	server: {
		port: 5173,
	},

	plugins: [
		pluginVue(),
		pluginUnwindCssModuleClassName(),
	],

	resolve: {
		extensions,
		alias: {
			'@/': __dirname + '/src/',
			'/client-assets/': __dirname + '/assets/',
			'/static-assets/': __dirname + '/../backend/assets/',
		},
	},

	css: {
		modules: {
			/**
			 * 正規化したファイルパスのハッシュ値をクラス名として使うようにする。
			 * デフォルトではCSSのハッシュ値などが使われてしまうため、CSSをほんの少し書き換えただけでクラス名が変わり、
			 * クラス名に依存した外部のスクリプト（ユーザースクリプトやユーザースタイルシートなど）が動かなくなってしまう。
			 * ファイルパスのハッシュ値であれば、ファイルを移動させるなどの大規模な変更が行われない限り、クラス名は変わらない。
			 * （そして大規模な変更ではそもそも外部スクリプトは動かなくなるのだから、クラス名が変わっても問題はない。）
			 *
			 * @param name     クラス名
			 * @param filename ファイルへの絶対パス（ただしクエリパラメータ付き）
			 * @param css      CSS文字列
			 */
			generateScopedName(name, filename, css): string {
				const removeQuery = (filename: string): string => {
					return filename.replace(/\?.*/, '');
				};

				const removeExtension = (filename: string): string => {
					return filename.replace(/\.\w+?$/, '');
				};

				const normalize = (filename: string, name: string, root: string): string => {
					const actualFilename = removeExtension(path.relative(root, removeQuery(filename)));
					return [...actualFilename.split(/[/.]/), name].join('-');
				};

				const hash = (data: crypto.BinaryLike): string => {
					return crypto.createHash('SHA-256').update(data).digest('base64url');
				};

				const normalized = normalize(filename, name, path.join(__dirname, 'src'));

				if (process.env['NODE_ENV'] === 'production') {
					return 'x' + hash(normalized).substring(0, 4);
				} else {
					return normalized;
				}
			},
		},
	},

	define: {
		_VERSION_: JSON.stringify(meta.version),
		_LANGS_: JSON.stringify(Object.entries(languages)),
		_DEV_: process.env['NODE_ENV'] !== 'production',
		_DATA_TRANSFER_DRIVE_FILE_: JSON.stringify('mk_drive_file'),
		_DATA_TRANSFER_DRIVE_FOLDER_: JSON.stringify('mk_drive_folder'),
		_DATA_TRANSFER_DECK_COLUMN_: JSON.stringify('mk_deck_column'),
	},

	build: {
		target: [
			'chrome116',
			'firefox116',
			'safari16',
		],
		manifest: 'manifest.json',
		rollupOptions: {
			input: {
				app: './src/_boot_.ts',
			},
			output: {
				manualChunks: {
					vue: ['vue'],
					photoswipe: ['photoswipe', 'photoswipe/lightbox', 'photoswipe/style.css'],
				},
				chunkFileNames: process.env['NODE_ENV'] === 'production' ? '[hash:8].js' : '[name]-[hash:8].js',
				assetFileNames: process.env['NODE_ENV'] === 'production' ? '[hash:8][extname]' : '[name]-[hash:8][extname]',
			},
		},
		cssCodeSplit: true,
		outDir: 'built',
		assetsDir: '.',
		emptyOutDir: false,
		sourcemap: process.env['NODE_ENV'] === 'development',
		reportCompressedSize: false,

		// https://vitejs.dev/guide/dep-pre-bundling.html#monorepos-and-linked-dependencies
		commonjsOptions: {
			include: [/misskey-js/, /node_modules/],
		},
	},

	worker: {
		format: 'es',
	},

	test: {
		environment: 'happy-dom',
		deps: {
			optimizer: {
				web: {
					include: [
						// XXX: misskey-dev/browser-image-resizer has no "type": "module"
						'browser-image-resizer',
					],
				},
			},
		},
		includeSource: ['src/**/*.ts'],
	},
};

const config = defineConfig(baseConfig);

export default config;
