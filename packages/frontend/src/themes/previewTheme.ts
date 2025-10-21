import { parseThemeCode } from './parseThemeCode.js';
import { applyTheme } from './theme.js';

export function previewTheme(code: string): void {
	const theme = parseThemeCode(code);
	if (theme) applyTheme(theme, true);
}
