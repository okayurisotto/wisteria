// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

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
);
