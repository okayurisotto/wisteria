import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/** `/packages/backend/built/path.ts` */
const _filename = fileURLToPath(import.meta.url);

/** `/packages/backend/built` */
const _dirname = path.dirname(_filename);

/** `/` */
const ROOT_DIR = path.join(_dirname, '../../..');

/** `/.config` */
const CONFIG_DIR = path.join(ROOT_DIR, '.config');

/**
 * - `/.config/${MISSKEY_CONFIG_YML}`
 * - `/.config/default.yml`
 * - `/.config/test.yml`
 */
export const CONFIG_FILE = process.env['MISSKEY_CONFIG_YML']
	? path.join(CONFIG_DIR, process.env['MISSKEY_CONFIG_YML'])
	: process.env['NODE_ENV'] === 'test'
		? path.join(CONFIG_DIR, 'test.yml')
		: path.join(CONFIG_DIR, 'default.yml');

/** `/built` */
const BUILT_DIR = path.join(ROOT_DIR, 'built');

/** `/built/meta.json` */
export const META_FILE = path.join(BUILT_DIR, 'meta.json');

/** `/built/_frontend_dist_` */
export const FRONTEND_DIST_ASSETS_DIR = path.join(BUILT_DIR, '_frontend_dist_');

/** `/built/_sw_dist_` */
export const SW_ASSETS_DIR = path.join(BUILT_DIR, '_sw_dist_');

/** `/built/_vite_` */
export const VITE_OUT_DIR = path.join(BUILT_DIR, '_vite_');

/** `/built/_vite_/manifest.json` */
export const FRONTEND_MANIFEST_FILE = path.join(VITE_OUT_DIR, 'manifest.json');

/** `/built/tarball` */
export const TARBALL_DIR = path.join(BUILT_DIR, 'tarball');

/** `/fluent-emojis/dist` */
export const FLUENT_EMOJI_DIR = path.join(ROOT_DIR, 'fluent-emojis/dist');

/** `/files` */
export const INTERNAL_STORAGE_DIR = path.join(ROOT_DIR, 'files');

/** `/packages/backend` */
const BACKEND_DIR = path.join(ROOT_DIR, 'packages/backend');

/** `/packages/backend/nsfw-model/` */
export const NSFW_MODEL_DIR = pathToFileURL(
	path.join(BACKEND_DIR, 'nsfw-model/'),
).href;

/** `/packages/backend/assets` */
export const STATIC_ASSETS_DIR = path.join(BACKEND_DIR, 'assets');

/** `/packages/backend/built/server/assets` */
export const ASSETS_DIR = path.join(BACKEND_DIR, 'built/server/assets');

/** `/packages/backend/built/server/assets/dummy.png` */
export const DUMMY_PNG_FILE = path.join(ASSETS_DIR, 'dummy.png');

/** `/packages/backend/built/server/web/views` */
export const PUG_DIR = path.join(BACKEND_DIR, 'built/server/web/views');

/** `/packages/backend/node_modules/@discordapp/twemoji/dist/svg` */
export const TWEMOJI_DIR = path.join(
	BACKEND_DIR,
	'node_modules/@discordapp/twemoji/dist/svg',
);

/** `/packages/frontend/assets` */
export const FRONTEND_ASSETS_DIR = path.join(
	ROOT_DIR,
	'packages/frontend/assets',
);
