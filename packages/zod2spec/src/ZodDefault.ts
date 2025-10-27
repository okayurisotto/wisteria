import { z } from 'zod';
import type { Converter } from './type.js';

export const ZodDefault = z.object({
	type: z.literal('default'),
	defaultValue: z.unknown(),
	innerType: z.custom<z.ZodType>(),
});

export const convertZodDefault: Converter<typeof ZodDefault> = (
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
		default: result.defaultValue,
	};
};
