import * as path from 'node:path';
import { envOption } from './env.js';

/** `/packages/backend/built` */
const _dirname = import.meta.dirname;

/** `/` */
const ROOT_DIR = path.join(_dirname, '../../..');

/** `/.config` */
const CONFIG_DIR = path.join(ROOT_DIR, '.config');

/**
 * - `/.config/${MISSKEY_CONFIG_YML}`
 * - `/.config/default.yml`
 * - `/.config/test.yml`
 */
export const CONFIG_FILE = envOption.MISSKEY_CONFIG_YML
	? path.join(CONFIG_DIR, envOption.MISSKEY_CONFIG_YML)
	: envOption.isTest
		? path.join(CONFIG_DIR, 'test.yml')
		: path.join(CONFIG_DIR, 'default.yml');

/** `/built` */
const BUILT_DIR = path.join(ROOT_DIR, 'built');

/** `/built/package.json` */
export const PACKAGE_JSON_FILE = path.join(ROOT_DIR, 'package.json');

/** `/packages/locales/built` */
export const LOCALES_DIR = path.join(ROOT_DIR, 'packages/locales/built');

/** `/packages/sw/built` */
export const SW_ASSETS_DIR = path.join(ROOT_DIR, 'packages/sw/built');

/** `/packages/frontend/built` */
export const VITE_OUT_DIR = path.join(ROOT_DIR, 'packages/frontend/built');

/** `/packages/frontend/built/manifest.json` */
export const FRONTEND_MANIFEST_FILE = path.join(VITE_OUT_DIR, 'manifest.json');

/** `/packages/frontend/node_modules/@tabler/icons-webfont` */
export const TABLER_ICONS_DIR = path.join(ROOT_DIR, 'packages/frontend/node_modules/@tabler/icons-webfont');

/** `/built/tarball` */
export const TARBALL_DIR = path.join(BUILT_DIR, 'tarball');

/** `/fluent-emojis/dist` */
export const FLUENT_EMOJI_DIR = path.join(ROOT_DIR, 'fluent-emojis/dist');

/** `/files` */
export const INTERNAL_STORAGE_DIR = path.join(ROOT_DIR, 'files');

/** `/packages/backend` */
const BACKEND_DIR = path.join(ROOT_DIR, 'packages/backend');

/** `/packages/backend/assets` */
export const STATIC_ASSETS_DIR = path.join(BACKEND_DIR, 'assets');

/** `/packages/backend/migration/*.js` */
export const DATABASE_MIGRATION_FILES = path.join(BACKEND_DIR, 'migration/*.js');

/** `/packages/backend/built/server/assets` */
export const ASSETS_DIR = path.join(BACKEND_DIR, 'built/server/assets');

/** `/packages/backend/built/server/assets/dummy.png` */
export const DUMMY_PNG_FILE = path.join(ASSETS_DIR, 'dummy.png');

/** `/packages/backend/built/server/web/views` */
export const PUG_DIR = path.join(BACKEND_DIR, 'built/server/web/views');

/** `/packages/backend/node_modules/@discordapp/twemoji/dist/svg` */
export const TWEMOJI_DIR = path.join(BACKEND_DIR, 'node_modules/@discordapp/twemoji/dist/svg');

/** `/packages/frontend/assets` */
export const FRONTEND_ASSETS_DIR = path.join(ROOT_DIR, 'packages/frontend/assets');
