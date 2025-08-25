import { parseThemeCode } from './parseThemeCode.js';
import { addTheme } from './store.js';

export async function installTheme(code: string): Promise<void> {
	const theme = parseThemeCode(code);
	if (!theme) return;
	await addTheme(theme);
}
