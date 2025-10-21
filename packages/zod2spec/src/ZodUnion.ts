import { z } from 'zod';
import type { Converter } from './type.js';

export const ZodUnion = z.object({
	type: z.literal('union'),
	options: z.array(z.custom<z.ZodType>()),
});

export const convertZodUnion: Converter<typeof ZodUnion> = (result, description, recursive) => {
	return {
		anyOf: result.options.map(schema => recursive(schema)),
		...(description !== undefined
			? { description }
			: {}),
	};
};
