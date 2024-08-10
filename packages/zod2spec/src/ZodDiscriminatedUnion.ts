import { z } from 'zod';
import type { Converter } from './type.js';

export const ZodDiscriminatedUnion = z.object({
	typeName: z.literal('ZodDiscriminatedUnion'),
	description: z.string().optional(),
	options: z.array(z.custom<z.ZodType>()),
});

export const convertZodDiscriminatedUnion: Converter<typeof ZodDiscriminatedUnion> = (result, recursive) => {
	return {
		anyOf: result.options.map(schema => recursive(schema)),
		...(result.description !== undefined
			? { description: result.description }
			: {}),
	};
};
