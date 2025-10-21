import { z } from 'zod';
import type { Converter } from './type.js';

export const ZodLiteral = z.object({
	type: z.literal('literal'),
	values: z.unknown().array(),
});

export const convertZodLiteral: Converter<typeof ZodLiteral> = (result, description) => {
	return {
		...(description !== undefined
			? { description }
			: {}),
		enum: result.values,
	};
};
