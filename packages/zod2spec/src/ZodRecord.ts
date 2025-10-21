import { z } from 'zod';
import type { Converter } from './type.js';

export const ZodRecord = z.object({
	type: z.literal('record'),
	keyType: z.custom<z.ZodType>(),
	valueType: z.custom<z.ZodType>(),
});

export const convertZodRecord: Converter<typeof ZodRecord> = (result, description, recursive) => {
	return {
		type: 'object',
		...(description !== undefined
			? { description }
			: {}),
		additionalProperties: recursive(result.valueType),
	};
};
