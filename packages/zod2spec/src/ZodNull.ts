import { z } from 'zod';
import type { Converter } from './type.js';

export const ZodNull = z.object({
	type: z.literal('null'),
});

export const convertZodNull: Converter<typeof ZodNull> = (_result, description) => {
	return {
		type: 'null',
		...(description !== undefined
			? { description }
			: {}),
	};
};
