/**
 * Languages Loader
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as yaml from 'js-yaml';

const languages = [
	'ar-SA',
	'cs-CZ',
	'da-DK',
	'de-DE',
	'en-US',
	'es-ES',
	'fr-FR',
	'id-ID',
	'it-IT',
	'ja-JP',
	'ja-KS',
	'kab-KAB',
	'kn-IN',
	'ko-KR',
	'nl-NL',
	'no-NO',
	'pl-PL',
	'pt-PT',
	'ru-RU',
	'sk-SK',
	'th-TH',
	'ug-CN',
	'uk-UA',
	'vi-VN',
	'zh-CN',
	'zh-TW',
];

const primaries = {
	'en': 'US',
	'ja': 'JP',
	'zh': 'CN',
};

/**
 * @param  {Record<PropertyKey, unknown>[]} args
 * @returns {Record<PropertyKey, unknown>}
 */
const merge = (...args) => {
	return args.reduce((prev, current) => ({
		...prev,
		...current,
		...Object.entries(prev)
			.filter(([k]) => current && typeof current[k] === 'object')
			.reduce((a, [k, v]) => (a[k] = merge(v, current[k]), a), {})
	}), {});
};

// 何故か文字列にバックスペース文字が混入することがあり、YAMLが壊れるので取り除く
/**
 * @param {string} text
 */
const clean = (text) => {
	return text.replace(new RegExp(String.fromCodePoint(0x08), 'g'), '');
};

/**
 * 空文字列が入ることがあり、フォールバックが動作しなくなるのでプロパティごと消す
 * @param {Record<string, unknown>} obj
 */
const removeEmpty = (obj) => {
	for (const [k, v] of Object.entries(obj)) {
		if (v === '') {
			delete obj[k];
		} else if (typeof v === 'object') {
			removeEmpty(v);
		}
	}
	return obj;
};

export function build() {
	const locales = languages.reduce((prev, current) => {
		const filename = path.join(import.meta.dirname, `${current}.yml`);
		const content = fs.readFileSync(filename, 'utf-8');
		prev[current] = yaml.load(clean(content)) ?? {};
		return prev;
	}, {});

	removeEmpty(locales);

	return Object.entries(locales)
		.reduce((prev, [key, value]) => {
			prev[key] = (() => {
				const [lang] = key.split('-');

				switch (key) {
					case 'ja-JP': {
						return value;
					}
					case 'ja-KS': {
						return merge(locales['ja-JP'], value);
					}
					case 'en-US': {
						return merge(locales['ja-JP'], value);
					}
					default: {
						return merge(
							locales['ja-JP'],
							locales['en-US'],
							locales[`${lang}-${primaries[lang]}`] ?? {},
							value,
						);
					}
				}
			})();

			return prev;
		}, {});
}

export default build();
