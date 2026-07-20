import { defineConfig } from 'tsdown';

import ar_SA from './data/ar-SA.json' with { type: 'json' };
import bn_BD from './data/bn-BD.json' with { type: 'json' };
import ca_ES from './data/ca-ES.json' with { type: 'json' };
import cs_CZ from './data/cs-CZ.json' with { type: 'json' };
import da_DK from './data/da-DK.json' with { type: 'json' };
import de_DE from './data/de-DE.json' with { type: 'json' };
import el_GR from './data/el-GR.json' with { type: 'json' };
import en_US from './data/en-US.json' with { type: 'json' };
import es_ES from './data/es-ES.json' with { type: 'json' };
import fr_FR from './data/fr-FR.json' with { type: 'json' };
import hr_HR from './data/hr-HR.json' with { type: 'json' };
import ht_HT from './data/ht-HT.json' with { type: 'json' };
import hu_HU from './data/hu-HU.json' with { type: 'json' };
import id_ID from './data/id-ID.json' with { type: 'json' };
import it_IT from './data/it-IT.json' with { type: 'json' };
import ja_JP from './data/ja-JP.json' with { type: 'json' };
import ja_KS from './data/ja-KS.json' with { type: 'json' };
import jbo_EN from './data/jbo-EN.json' with { type: 'json' };
import kab_KAB from './data/kab-KAB.json' with { type: 'json' };
import kn_IN from './data/kn-IN.json' with { type: 'json' };
import ko_GS from './data/ko-GS.json' with { type: 'json' };
import ko_KR from './data/ko-KR.json' with { type: 'json' };
import lo_LA from './data/lo-LA.json' with { type: 'json' };
import nl_NL from './data/nl-NL.json' with { type: 'json' };
import no_NO from './data/no-NO.json' with { type: 'json' };
import pl_PL from './data/pl-PL.json' with { type: 'json' };
import pt_PT from './data/pt-PT.json' with { type: 'json' };
import ro_RO from './data/ro-RO.json' with { type: 'json' };
import ru_RU from './data/ru-RU.json' with { type: 'json' };
// import si_LK from './data/si-LK.json' with { type: 'json' };
import sk_SK from './data/sk-SK.json' with { type: 'json' };
import sv_SE from './data/sv-SE.json' with { type: 'json' };
import th_TH from './data/th-TH.json' with { type: 'json' };
import tr_TR from './data/tr-TR.json' with { type: 'json' };
import ug_CN from './data/ug-CN.json' with { type: 'json' };
import uk_UA from './data/uk-UA.json' with { type: 'json' };
import uz_UZ from './data/uz-UZ.json' with { type: 'json' };
import vi_VN from './data/vi-VN.json' with { type: 'json' };
import zh_CN from './data/zh-CN.json' with { type: 'json' };
import zh_TW from './data/zh-TW.json' with { type: 'json' };

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
	fixedExtension: false,
	dts: false,
});
