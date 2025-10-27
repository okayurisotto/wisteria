import { z } from 'zod';
import type { Converter } from './type.js';

export const ZodEffects = z.object({
	type: z.literal('effects'),
	schema: z.custom<z.ZodType>(),
});

export const convertZodEffects: Converter<typeof ZodEffects> = (
	result,
	description,
	recursive,
) => {
	return {
		...(description !== undefined
				? { description }
				: {}),
		...recursive(result.schema),
	};
};
