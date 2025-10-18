import { defineConfig } from 'tsup';

import ar_SA from './data/ar-SA.json';
import bn_BD from './data/bn-BD.json';
import ca_ES from './data/ca-ES.json';
import cs_CZ from './data/cs-CZ.json';
import da_DK from './data/da-DK.json';
import de_DE from './data/de-DE.json';
import el_GR from './data/el-GR.json';
import en_US from './data/en-US.json';
import es_ES from './data/es-ES.json';
import fr_FR from './data/fr-FR.json';
import hr_HR from './data/hr-HR.json';
import ht_HT from './data/ht-HT.json';
import hu_HU from './data/hu-HU.json';
import id_ID from './data/id-ID.json';
import it_IT from './data/it-IT.json';
import ja_JP from './data/ja-JP.json';
import ja_KS from './data/ja-KS.json';
import jbo_EN from './data/jbo-EN.json';
import kab_KAB from './data/kab-KAB.json';
import kn_IN from './data/kn-IN.json';
import ko_GS from './data/ko-GS.json';
import ko_KR from './data/ko-KR.json';
import lo_LA from './data/lo-LA.json';
import nl_NL from './data/nl-NL.json';
import no_NO from './data/no-NO.json';
import pl_PL from './data/pl-PL.json';
import pt_PT from './data/pt-PT.json';
import ro_RO from './data/ro-RO.json';
import ru_RU from './data/ru-RU.json';
// import si_LK from './data/si-LK.json';
import sk_SK from './data/sk-SK.json';
import sv_SE from './data/sv-SE.json';
import th_TH from './data/th-TH.json';
import tr_TR from './data/tr-TR.json';
import ug_CN from './data/ug-CN.json';
import uk_UA from './data/uk-UA.json';
import uz_UZ from './data/uz-UZ.json';
import vi_VN from './data/vi-VN.json';
import zh_CN from './data/zh-CN.json';
import zh_TW from './data/zh-TW.json';

export const languages: Record<string, string> = {
	'ar-SA': ar_SA._lang_,
	'bn-BD': bn_BD._lang_,
	'ca-ES': ca_ES._lang_,
	'cs-CZ': cs_CZ._lang_,
	'da-DK': da_DK._lang_,
	'de-DE': de_DE._lang_,
	'el-GR': el_GR._lang_,
	'en-US': en_US._lang_,
	'es-ES': es_ES._lang_,
	'fr-FR': fr_FR._lang_,
	'hr-HR': hr_HR._lang_,
	'ht-HT': ht_HT._lang_,
	'hu-HU': hu_HU._lang_,
	'id-ID': id_ID._lang_,
	'it-IT': it_IT._lang_,
	'ja-JP': ja_JP._lang_,
	'ja-KS': ja_KS._lang_,
	'jbo-EN': jbo_EN._lang_,
	'kab-KAB': kab_KAB._lang_,
	'kn-IN': kn_IN._lang_,
	'ko-GS': ko_GS._lang_,
	'ko-KR': ko_KR._lang_,
	'lo-LA': lo_LA._lang_,
	'nl-NL': nl_NL._lang_,
	'no-NO': no_NO._lang_,
	'pl-PL': pl_PL._lang_,
	'pt-PT': pt_PT._lang_,
	'ro-RO': ro_RO._lang_,
	'ru-RU': ru_RU._lang_,
	// 'si-LK': si_LK._lang_,
	'sk-SK': sk_SK._lang_,
	'sv-SE': sv_SE._lang_,
	'th-TH': th_TH._lang_,
	'tr-TR': tr_TR._lang_,
	'ug-CN': ug_CN._lang_,
	'uk-UA': uk_UA._lang_,
	'uz-UZ': uz_UZ._lang_,
	'vi-VN': vi_VN._lang_,
	'zh-CN': zh_CN._lang_,
	'zh-TW': zh_TW._lang_,
};

export default defineConfig({
	tsconfig: "tsconfig.app.json",
	entry: ['./src/index.ts'],
	format: 'esm',
	minify: true,
	outDir: 'built',
	define: {
		_LANGUAGES_: JSON.stringify(languages), // バンドルサイズ削減のため
	},
});
