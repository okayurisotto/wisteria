// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import stylistic from '@stylistic/eslint-plugin';

export default tseslint.config(
	{ ignores: ['built/'] },

	// ESLint config
	eslint.configs.recommended,

	// TypeScript support
	...tseslint.configs.strictTypeChecked,
	{
		languageOptions: {
			parserOptions: {
				extraFileExtensions: ['.vue'],
				projectService: true, // https://typescript-eslint.io/blog/announcing-typescript-eslint-v8-beta#project-service
				tsconfigRootDir: import.meta.dirname,
			},
		},
	},
	{
		rules: {
			'@typescript-eslint/consistent-type-exports': ['error'],
			'@typescript-eslint/consistent-type-imports': ['error'],
			'@typescript-eslint/method-signature-style': ['error'],
			'@typescript-eslint/no-import-type-side-effects': ['error'],
			'@typescript-eslint/no-unnecessary-parameter-property-assignment': ['error'],
			'@typescript-eslint/no-unnecessary-qualifier': ['error'],
			'@typescript-eslint/no-useless-empty-export': ['error'],
			'@typescript-eslint/parameter-properties': ['error', { prefer: 'parameter-property' }],
			'@typescript-eslint/prefer-readonly': ['error'],
			'@typescript-eslint/require-array-sort-compare': ['error'],
			'@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
			'@typescript-eslint/strict-boolean-expressions': ['error'],
			'@typescript-eslint/switch-exhaustiveness-check': ['error'],

			'default-param-last': ['off'],
			'@typescript-eslint/default-param-last': ['error'],

			'init-declarations': ['off'],
			'@typescript-eslint/init-declarations': ['error'],

			'no-loop-func': ['off'],
			'@typescript-eslint/no-loop-func': ['error'],

			// TODO
			// '@typescript-eslint/explicit-member-accessibility': ['error'],
		},
	},

	// ESLint Stylistic
	// @ts-expect-error exactOptionalPropertyTypes
	stylistic.configs.customize({
		indent: 'tab',
		semi: true,
	}),
	{
		rules: {
			'@stylistic/brace-style': ['error', '1tbs'],
			'@stylistic/indent-binary-ops': ['error', 'tab'],
			'@stylistic/multiline-comment-style': ['off'], // `@ts`コメントを考慮してくれないため
			'@stylistic/operator-linebreak': ['error', 'before', { overrides: { '=': 'after', '&&': 'after', '||': 'after' } }],
		},
	},
);
