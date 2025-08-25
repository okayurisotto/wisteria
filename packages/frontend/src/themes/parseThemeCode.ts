import JSON5 from 'json5';
import { getThemes } from './store.js';
import { type Theme, validateTheme } from './theme.js';

export function parseThemeCode(code: string): Theme {
	let theme;

	try {
		theme = JSON5.parse(code);
	} catch (err) {
		throw new Error('Failed to parse theme json');
	}
	if (!validateTheme(theme)) {
		throw new Error('This theme is invaild');
	}
	if (getThemes().some(t => t.id === theme.id)) {
		throw new Error('This theme is already installed');
	}

	return theme;
}
