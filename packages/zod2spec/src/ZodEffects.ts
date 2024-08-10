import { z } from 'zod';
import type { Converter } from './type.js';

export const ZodEffects = z.object({
	typeName: z.literal('ZodEffects'),
	schema: z.custom<z.ZodType>(),
});

export const convertZodEffects: Converter<typeof ZodEffects> = (
	result,
	recursive,
) => {
	return recursive(result.schema);
};
