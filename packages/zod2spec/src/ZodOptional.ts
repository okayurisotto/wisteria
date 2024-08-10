import { z } from 'zod';
import type { Converter } from './type.js';

export const ZodOptional = z.object({
	typeName: z.literal('ZodOptional'),
	description: z.string().optional(),
	innerType: z.custom<z.ZodType>(),
});

export const convertZodOptional: Converter<typeof ZodOptional> = (
	result,
	recursive,
) => {
	const inner = recursive(result.innerType);
	return {
		...inner,
	};
};
