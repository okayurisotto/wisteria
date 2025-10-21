import { z } from 'zod';
import type { Converter } from './type.js';

export const ZodEnum = z.object({
	type: z.literal('enum'),
	entries: z.record(z.string(), z.string()),
});

export const convertZodEnum: Converter<typeof ZodEnum> = (result, description) => {
	return {
		type: 'string',
		enum: Object.values(result.entries),
		...(description !== undefined
			? { description }
			: {}),
	};
};
