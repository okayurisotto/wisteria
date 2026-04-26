import { readFile } from 'node:fs/promises';
import dns from 'node:dns';
import { defineConfig } from 'vite';
import * as yaml from 'js-yaml';
import { baseConfig } from './vite.config.js';

dns.setDefaultResultOrder('ipv4first');

const { port } = yaml.load(await readFile('../../.config/default.yml', 'utf-8'));

const httpUrl = `http://localhost:${port}/`;
const websocketUrl = `ws://localhost:${port}/`;

export default defineConfig({
	// 基本の設定は vite.config.js から引き継ぐ
	...baseConfig,
	root: 'src',
	publicDir: '../assets',
	base: './',
	server: {
		host: 'localhost',
		port: 5173,
		proxy: {
			'/api': {
				changeOrigin: true,
				target: httpUrl,
			},
			'/emoji/': httpUrl,
			'/assets': httpUrl,
			'/static-assets': httpUrl,
			'/client-assets': httpUrl,
			'/files': httpUrl,
			'/twemoji': httpUrl,
			'/sw.js': httpUrl,
			'/streaming': {
				target: websocketUrl,
				ws: true,
			},
			'/favicon.ico': httpUrl,
			'/identicon': {
				target: httpUrl,
				rewrite(path) {
					return path.replace('@localhost:5173', '');
				},
			},
			'/url': httpUrl,
			'/proxy': httpUrl,
		},
	},
	build: {
		...baseConfig.build,
		rollupOptions: {
			...baseConfig.build?.rollupOptions,
			input: 'index.html',
		},
	},
});
