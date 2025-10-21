import { z } from 'zod';
import type { Converter } from './type.js';

export const ZodIntersection = z.object({
	type: z.literal('intersection'),
	left: z.custom<z.ZodType>(),
	right: z.custom<z.ZodType>(),
});

export const convertZodIntersection: Converter<typeof ZodIntersection> = (result, description, recursive) => {
	return {
		allOf: [recursive(result.left), recursive(result.right)],
		...(description !== undefined
			? { description }
			: {}),
	};
};
