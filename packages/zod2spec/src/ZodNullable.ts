import { z } from 'zod';
import type { Converter } from './type.js';

export const ZodNullable = z.object({
	type: z.literal('nullable'),
	innerType: z.custom<z.ZodType>(),
});

export const convertZodNullable: Converter<typeof ZodNullable> = (
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
		nullable: true,
	};
};
