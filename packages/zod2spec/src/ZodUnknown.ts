import { z } from 'zod';
import type { Converter } from './type.js';

export const ZodUnknown = z.object({
	type: z.literal('unknown'),
});

export const convertZodUnknown: Converter<typeof ZodUnknown> = (result, description) => {
	return {
		...(description !== undefined
			? { description }
			: {}),
	};
};
