import { computed, ref, watch } from 'vue';
import type { BuiltinTheme } from 'shiki';
import tinycolor from 'tinycolor2';
import { instance } from '@/instance.js';
import { colorScheme, type ColorScheme } from './colorScheme.js';
import { getThemes } from './store.js';
import { parseThemeCode } from './parseThemeCode.js';

import _light from './base/_light.json';
import _dark from './base/_dark.json';

import lLight from './builtin/l-light.json';
import lCoffee from './builtin/l-coffee.json';
import lApricot from './builtin/l-apricot.json';
import lRainy from './builtin/l-rainy.json';
import lBotanical from './builtin/l-botanical.json';
import lVivid from './builtin/l-vivid.json';
import lCherry from './builtin/l-cherry.json';
import lSushi from './builtin/l-sushi.json';
import lU0 from './builtin/l-u0.json';
import dDark from './builtin/d-dark.json';
import dPersimmon from './builtin/d-persimmon.json';
import dAstro from './builtin/d-astro.json';
import dFuture from './builtin/d-future.json';
import dBotanical from './builtin/d-botanical.json';
import dGreenLime from './builtin/d-green-lime.json';
import dGreenOrange from './builtin/d-green-orange.json';
import dCherry from './builtin/d-cherry.json';
import dIce from './builtin/d-ice.json';
import dU0 from './builtin/d-u0.json';

export type Theme = {
	id: string;
	name: string;
	author: string;
	desc?: string;
	base?: ColorScheme;
	props: Record<string, string>;
	codeHighlighter?:
		| { base: BuiltinTheme; overrides?: Record<string, unknown> }
		| { base: '_none_'; overrides: Record<string, unknown> };
};

const SELECTED_LIGHT_THEME_ID = 'SELECTED_LIGHT_THEME_ID' as const;
const SELECTED_DARK_THEME_ID = 'SELECTED_DARK_THEME_ID' as const;

export const builtinLightThemes = ref<Theme[]>([lLight, lCoffee, lApricot, lRainy, lBotanical, lVivid, lCherry, lSushi, lU0]);
export const builtinDarkThemes = ref<Theme[]>([dDark, dPersimmon, dAstro, dFuture, dBotanical, dGreenLime, dGreenOrange, dCherry, dIce, dU0]);
export const builtinThemes = computed<Theme[]>(() => [...builtinLightThemes.value, ...builtinDarkThemes.value]);

export const installedThemes = ref<Theme[]>(getThemes());
export const installedLightThemes = computed<Theme[]>(() => installedThemes.value.filter(v => v.base === 'light'));
export const installedDarkThemes = computed<Theme[]>(() => installedThemes.value.filter(v => v.base === 'dark'));

export const instanceLightTheme = computed<Theme | undefined>(() => {
	try {
		return instance.defaultLightTheme !== null
			? parseThemeCode(instance.defaultLightTheme)
			: undefined;
	} catch {
		console.log('!!!', instance.defaultLightTheme);
		return undefined;
	}
});
export const instanceDarkTheme = computed<Theme | undefined>(() => {
	try {
		return instance.defaultDarkTheme !== null
			? parseThemeCode(instance.defaultDarkTheme)
			: undefined;
	} catch {
		console.log('!!!', instance.defaultDarkTheme);
		return undefined;
	}
});

export const allThemes = computed<Theme[]>(() => [
	...builtinThemes.value,
	...installedThemes.value,
	...(instanceLightTheme.value !== undefined ? [instanceLightTheme.value] : []),
	...(instanceDarkTheme.value !== undefined ? [instanceDarkTheme.value] : []),
]);
export const lightThemes = computed<Theme[]>(() => [
	...builtinLightThemes.value,
	...installedLightThemes.value,
	...(instanceLightTheme.value !== undefined ? [instanceLightTheme.value] : []),
]);
export const darkThemes = computed<Theme[]>(() => [
	...builtinDarkThemes.value,
	...installedDarkThemes.value,
	...(instanceDarkTheme.value !== undefined ? [instanceDarkTheme.value] : []),
]);

export const defaultLightTheme = computed<Theme>(() => instanceLightTheme.value ?? lLight);
export const defaultDarkTheme = computed<Theme>(() => instanceDarkTheme.value ?? dDark);

export const selectedLightThemeId = ref<string>();
export const selectedDarkThemeId = ref<string>();

export const primaryLightTheme = computed<Theme>(() => {
  const theme = lightThemes.value.find(({ id }) => id === (selectedLightThemeId.value));
  return theme ?? defaultLightTheme.value;
});
export const primaryDarkTheme = computed<Theme>(() => {
  const theme = darkThemes.value.find(({ id }) => id === (selectedDarkThemeId.value));
  return theme ?? defaultDarkTheme.value;
});
const primaryTheme = computed<Theme>(() => {
  switch (colorScheme.value) {
    case 'light': return primaryLightTheme.value;
    case 'dark': return primaryDarkTheme.value;
		default: return colorScheme.value satisfies never;
  }
});

export const validateTheme = (theme: Record<string, any>): boolean => {
	if (theme.id == null || typeof theme.id !== 'string') return false;
	if (theme.name == null || typeof theme.name !== 'string') return false;
	if (theme.base == null || !['light', 'dark'].includes(theme.base)) return false;
	if (theme.props == null || typeof theme.props !== 'object') return false;
	return true;
};

const getColor = (props: Theme['props'], value: string): tinycolor.Instance => {
	if (value.startsWith('@')) { // ref (prop)
		return getColor(props, props[value.substring(1)]);
	} else if (value.startsWith('$')) { // ref (const)
		return getColor(props, props[value]);
	} else if (value.startsWith(':')) { // func
		const [func_, arg_, ...rest] = value.split('<');
		const func = func_.substring(1);
		const arg = parseFloat(arg_);
		const color = getColor(props, rest.join('<'));

		switch (func) {
			case 'darken': return color.darken(arg);
			case 'lighten': return color.lighten(arg);
			case 'alpha': return color.setAlpha(arg);
			case 'hue': return color.spin(arg);
			case 'saturate': return color.saturate(arg);
		}
	}

	return tinycolor(value);
};

const compile = (props: Theme['props']): Record<string, string> => {
	const propss: Record<string, string> = {};

	for (const [k, v] of Object.entries(props)) {
		if (k.startsWith('$')) continue; // ignore const
		propss[k] = v.startsWith('"') ? v.replace(/^"\s*/, '') : getColor(props, v).toRgbString();
	}

	return propss;
};

let timeout: number | null = null;

export const applyTheme = (theme: Theme) => {
	if (timeout) window.clearTimeout(timeout);

	document.documentElement.classList.add('_themeChanging_');

	timeout = window.setTimeout(() => {
		document.documentElement.classList.remove('_themeChanging_');
	}, 1000);

	const base = [_light, _dark].find(x => x.id === theme.base);
	const compiledProps = compile({ ...base?.props, ...theme.props });

  for (const [k, v] of Object.entries(compiledProps)) {
		document.documentElement.style.setProperty(`--${k}`, v);
  }

	let meta = document.head.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
	if (meta === null) {
		meta = document.createElement('meta');
		meta.name = 'theme-color';
		document.head.insertAdjacentElement('beforeend', meta);
	}
	if (compiledProps['htmlThemeColor'] !== undefined) {
		meta.content = compiledProps['htmlThemeColor'];
	}
};

export const useTheme = () => {
  {
    const value = localStorage.getItem(SELECTED_LIGHT_THEME_ID);
    if (value !== null) {
      selectedLightThemeId.value = value;
    }
  }

  {
    const value = localStorage.getItem(SELECTED_DARK_THEME_ID);
    if (value !== null) {
      selectedDarkThemeId.value = value;
    }
  }

  watch(selectedLightThemeId, (value) => {
    if (value !== undefined) {
      localStorage.setItem(SELECTED_LIGHT_THEME_ID, value);
    } else {
      localStorage.removeItem(SELECTED_LIGHT_THEME_ID);
    }
  });

  watch(selectedDarkThemeId, (value) => {
    if (value !== undefined) {
      localStorage.setItem(SELECTED_DARK_THEME_ID, value);
    } else {
      localStorage.removeItem(SELECTED_DARK_THEME_ID);
    }
  });

  watch(primaryTheme, (value) => {
    applyTheme(value);
  }, {
    immediate: true,
  });
};
