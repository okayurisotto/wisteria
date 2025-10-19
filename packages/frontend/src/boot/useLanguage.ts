import { languages } from 'locales';

export const useLanguage = (): string => {
	const supportedLangs = Object.keys(languages);

	const lang = (() => {
		const from = localStorage.getItem('lang');

		if (from === null) {
			if (supportedLangs.includes(navigator.language)) {
				return {
					from,
					to: navigator.language,
				};
			} else {
				return {
					from,
					to: supportedLangs.find(l => l.startsWith(navigator.language + '-')) ?? 'en-US',
				};
			}
		} else {
			if (supportedLangs.includes(from)) {
				return { from, to: from };
			} else {
				console.error('invalid lang value detected!!!', from);
				return { from, to: 'en-US' };
			}
		}
	})();

	if (lang.to !== lang.from) {
		localStorage.setItem('lang', lang.to);
	}

	return lang.to;
};
