// @ts-check

import pluginVue from 'eslint-plugin-vue';
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript';

export default defineConfigWithVueTs(
	pluginVue.configs['flat/recommended'],
	vueTsConfigs.strictTypeChecked,
	vueTsConfigs.stylisticTypeChecked,
	{
		rules: {
			'vue/max-attributes-per-line': 'off',
		}
	},
);
