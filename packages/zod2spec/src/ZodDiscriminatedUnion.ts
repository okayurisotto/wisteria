import { z } from 'zod';
import type { Converter } from './type.js';

export const ZodDiscriminatedUnion = z.object({
	type: z.literal('discriminatedUnion'),
	options: z.array(z.custom<z.ZodType>()),
});

export const convertZodDiscriminatedUnion: Converter<typeof ZodDiscriminatedUnion> = (result, description, recursive) => {
	return {
		anyOf: result.options.map(schema => recursive(schema)),
		...(description !== undefined
			? { description }
			: {}),
	};
};
