import { z } from 'zod';
import type { Converter } from './type.js';

export const ZodOptional = z.object({
	type: z.literal('optional'),
	innerType: z.custom<z.ZodType>(),
});

export const convertZodOptional: Converter<typeof ZodOptional> = (
	result,
	description,
	recursive,
) => {
	const inner = recursive(result.innerType);
	return {
		...(description !== undefined
				? { description }
				: {}),
		...inner,
	};
};
