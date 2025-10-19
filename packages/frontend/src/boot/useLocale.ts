import { miLocalStorage } from '@/local-storage';
import { locales, type Locale } from 'locales';

export const useLocale = async (version: string, lang: string): Promise<Locale> => {
	const preParseLocale = miLocalStorage.getItem('locale');
	const locale = preParseLocale !== null ? JSON.parse(preParseLocale) as Locale : null;
	const localeVersion = miLocalStorage.getItem('localeVersion');

	if (localeVersion === null || localeVersion !== version || locale === null) {
		const newLocale = (await locales[lang]()) as Locale;
		const newLocaleJson = JSON.stringify(newLocale);

		miLocalStorage.setItem('locale', newLocaleJson);
		miLocalStorage.setItem('localeVersion', version);

		return newLocale;
	} else {
		return locale;
	}
};
