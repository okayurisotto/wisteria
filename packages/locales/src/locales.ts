import type locale from '../data/ja-JP.json';
import { merge } from './merge.js';

export type Locale = typeof locale;

const ar_SA = () => import('../data/ar-SA.json').then((m) => m.default);
const bn_BD = () => import('../data/bn-BD.json').then((m) => m.default);
const ca_ES = () => import('../data/ca-ES.json').then((m) => m.default);
const cs_CZ = () => import('../data/cs-CZ.json').then((m) => m.default);
const da_DK = () => import('../data/da-DK.json').then((m) => m.default);
const de_DE = () => import('../data/de-DE.json').then((m) => m.default);
const el_GR = () => import('../data/el-GR.json').then((m) => m.default);
const en_US = () => import('../data/en-US.json').then((m) => m.default);
const es_ES = () => import('../data/es-ES.json').then((m) => m.default);
const fr_FR = () => import('../data/fr-FR.json').then((m) => m.default);
const hr_HR = () => import('../data/hr-HR.json').then((m) => m.default);
const ht_HT = () => import('../data/ht-HT.json').then((m) => m.default);
const hu_HU = () => import('../data/hu-HU.json').then((m) => m.default);
const id_ID = () => import('../data/id-ID.json').then((m) => m.default);
const it_IT = () => import('../data/it-IT.json').then((m) => m.default);
const ja_JP = () => import('../data/ja-JP.json').then((m) => m.default);
const ja_KS = () => import('../data/ja-KS.json').then((m) => m.default);
const jbo_EN = () => import('../data/jbo-EN.json').then((m) => m.default);
const kab_KAB = () => import('../data/kab-KAB.json').then((m) => m.default);
const kn_IN = () => import('../data/kn-IN.json').then((m) => m.default);
const ko_GS = () => import('../data/ko-GS.json').then((m) => m.default);
const ko_KR = () => import('../data/ko-KR.json').then((m) => m.default);
const lo_LA = () => import('../data/lo-LA.json').then((m) => m.default);
const nl_NL = () => import('../data/nl-NL.json').then((m) => m.default);
const no_NO = () => import('../data/no-NO.json').then((m) => m.default);
const pl_PL = () => import('../data/pl-PL.json').then((m) => m.default);
const pt_PT = () => import('../data/pt-PT.json').then((m) => m.default);
const ro_RO = () => import('../data/ro-RO.json').then((m) => m.default);
const ru_RU = () => import('../data/ru-RU.json').then((m) => m.default);
// const si_LK = () => import('../data/si-LK.json').then((m) => m.default);
const sk_SK = () => import('../data/sk-SK.json').then((m) => m.default);
const sv_SE = () => import('../data/sv-SE.json').then((m) => m.default);
const th_TH = () => import('../data/th-TH.json').then((m) => m.default);
const tr_TR = () => import('../data/tr-TR.json').then((m) => m.default);
const ug_CN = () => import('../data/ug-CN.json').then((m) => m.default);
const uk_UA = () => import('../data/uk-UA.json').then((m) => m.default);
const uz_UZ = () => import('../data/uz-UZ.json').then((m) => m.default);
const vi_VN = () => import('../data/vi-VN.json').then((m) => m.default);
const zh_CN = () => import('../data/zh-CN.json').then((m) => m.default);
const zh_TW = () => import('../data/zh-TW.json').then((m) => m.default);

export const locales = {
	"ar-SA": async () => merge<Locale>([await ar_SA()], await ja_JP()),
	"bn-BD": async () => merge<Locale>([await bn_BD()], await ja_JP()),
	"ca-ES": async () => merge<Locale>([await ca_ES()], await ja_JP()),
	"cs-CZ": async () => merge<Locale>([await cs_CZ()], await ja_JP()),
	"da-DK": async () => merge<Locale>([await da_DK()], await ja_JP()),
	"de-DE": async () => merge<Locale>([await de_DE()], await ja_JP()),
	"el-GR": async () => merge<Locale>([await el_GR()], await ja_JP()),
	"en-US": async () => merge<Locale>([await en_US()], await ja_JP()),
	"es-ES": async () => merge<Locale>([await es_ES()], await ja_JP()),
	"fr-FR": async () => merge<Locale>([await fr_FR()], await ja_JP()),
	"hr-HR": async () => merge<Locale>([await hr_HR()], await ja_JP()),
	"ht-HT": async () => merge<Locale>([await ht_HT()], await ja_JP()),
	"hu-HU": async () => merge<Locale>([await hu_HU()], await ja_JP()),
	"id-ID": async () => merge<Locale>([await id_ID()], await ja_JP()),
	"it-IT": async () => merge<Locale>([await it_IT()], await ja_JP()),
	"ja-JP": async () => merge<Locale>([await ja_JP()], await ja_JP()),
	"ja-KS": async () => merge<Locale>([await ja_KS()], await ja_JP()),
	"jbo-EN": async () => merge<Locale>([await jbo_EN()], await ja_JP()),
	"kab-KAB": async () => merge<Locale>([await kab_KAB()], await ja_JP()),
	"kn-IN": async () => merge<Locale>([await kn_IN()], await ja_JP()),
	"ko-GS": async () => merge<Locale>([await ko_GS()], await ja_JP()),
	"ko-KR": async () => merge<Locale>([await ko_KR()], await ja_JP()),
	"lo-LA": async () => merge<Locale>([await lo_LA()], await ja_JP()),
	"nl-NL": async () => merge<Locale>([await nl_NL()], await ja_JP()),
	"no-NO": async () => merge<Locale>([await no_NO()], await ja_JP()),
	"pl-PL": async () => merge<Locale>([await pl_PL()], await ja_JP()),
	"pt-PT": async () => merge<Locale>([await pt_PT()], await ja_JP()),
	"ro-RO": async () => merge<Locale>([await ro_RO()], await ja_JP()),
	"ru-RU": async () => merge<Locale>([await ru_RU()], await ja_JP()),
	// "si-LK": async () => merge<Locale>([await si_LK()], await ja_JP()),
	"sk-SK": async () => merge<Locale>([await sk_SK()], await ja_JP()),
	"sv-SE": async () => merge<Locale>([await sv_SE()], await ja_JP()),
	"th-TH": async () => merge<Locale>([await th_TH()], await ja_JP()),
	"tr-TR": async () => merge<Locale>([await tr_TR()], await ja_JP()),
	"ug-CN": async () => merge<Locale>([await ug_CN()], await ja_JP()),
	"uk-UA": async () => merge<Locale>([await uk_UA()], await ja_JP()),
	"uz-UZ": async () => merge<Locale>([await uz_UZ()], await ja_JP()),
	"vi-VN": async () => merge<Locale>([await vi_VN()], await ja_JP()),
	"zh-CN": async () => merge<Locale>([await zh_CN()], await ja_JP()),
	"zh-TW": async () => merge<Locale>([await zh_TW(), await zh_CN()], await ja_JP()),
};
