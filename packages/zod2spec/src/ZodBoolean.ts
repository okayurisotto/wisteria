import { z } from 'zod';
import type { Converter } from './type.js';

export const ZodBoolean = z.object({
	type: z.literal('boolean'),
});

export const convertZodBoolean: Converter<typeof ZodBoolean> = (result, description) => {
	return {
		type: 'boolean',
		...(description !== undefined
			? { description }
			: {}),
	};
};
