import { z } from 'zod';
import type { Converter } from './type.js';

export const ZodAny = z.object({
	type: z.literal('any'),
});

export const convertZodAny: Converter<typeof ZodAny> = (result, description) => {
	return {
		...(description !== undefined
			? { description }
			: {}),
	};
};
