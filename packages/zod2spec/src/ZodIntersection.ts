import { z } from 'zod';
import type { Converter } from './type.js';

export const ZodIntersection = z.object({
	typeName: z.literal('ZodIntersection'),
	description: z.string().optional(),
	left: z.custom<z.ZodType>(),
	right: z.custom<z.ZodType>(),
});

export const convertZodIntersection: Converter<typeof ZodIntersection> = (result, recursive) => {
	return {
		allOf: [recursive(result.left), recursive(result.right)],
		...(result.description !== undefined
			? { description: result.description }
			: {}),
	};
};
