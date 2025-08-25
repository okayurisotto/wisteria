import { bundledThemesInfo } from 'shiki';
import darkPlus from 'shiki/themes/dark-plus.mjs';
import { deepClone } from './clone.js';
import type { ThemeRegistration } from 'shiki';
import lightTheme from '@/themes/base/_light.json';
import darkTheme from '@/themes/base/_dark.json';
import { primaryDarkTheme, primaryLightTheme } from '../themes/theme.js';

export async function getTheme(mode: 'light' | 'dark'): Promise<string> {
	const theme = deepClone(mode === 'light' ? primaryLightTheme.value : primaryDarkTheme.value);

	if (theme.base) {
		const base = [lightTheme, darkTheme].find(x => x.id === theme.base);
		if (base && base.codeHighlighter) {
			theme.codeHighlighter = {
				...base.codeHighlighter,
				...theme.codeHighlighter,
			};
		}
	}

	if (theme.codeHighlighter) {
		if (theme.codeHighlighter.base === '_none_') {
			let _res: ThemeRegistration = theme.codeHighlighter.overrides;
			return _res.name ?? theme.id;
		} else {
			const base = await bundledThemesInfo.find(t => t.id === theme.codeHighlighter!.base)?.import() ?? darkPlus;
			let _res: ThemeRegistration = {
				...theme.codeHighlighter.overrides,
				...('default' in base ? base.default : base),
			};
			return _res.name ?? theme.id;
		}
	}

	return 'dark-plus';
}
