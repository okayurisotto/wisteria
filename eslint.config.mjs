// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import stylistic from '@stylistic/eslint-plugin';

export default tseslint.config(
	// ESLint config
	eslint.configs.recommended,

	// TypeScript support
	...tseslint.configs.strictTypeChecked,
	{
		languageOptions: {
			parserOptions: {
				EXPERIMENTAL_useProjectService: true, // https://typescript-eslint.io/blog/announcing-typescript-eslint-v8-beta#project-service
				tsconfigRootDir: import.meta.dirname,
			},
		},
	},
	{
		rules: {
			'@typescript-eslint/consistent-type-imports': ['error'],
			'@typescript-eslint/no-import-type-side-effects': ['error'],
			'@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
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
