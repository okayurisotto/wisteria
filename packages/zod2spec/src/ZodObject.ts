import { z } from 'zod';
import type { Converter } from './type.js';

export const ZodObject = z.object({
	type: z.literal('object'),
	shape: z.record(z.string(), z.custom<z.ZodType>()),
	catchall: z.object({}).optional(),
});

export const convertZodObject: Converter<typeof ZodObject> = (
	result,
	description,
	recursive,
) => {
	const required = Object.entries(result.shape)
		.filter(([, v]) => !v.isOptional())
		.map(([k]) => k);

	return {
		type: 'object',
		...(description !== undefined
			? { description }
			: {}),
		properties: Object.fromEntries(
			Object.entries(result.shape).map(([k, v]) => [k, recursive(v)]),
		),
		...(required.length > 0 ? { required } : {}),
		additionalProperties:
      result.catchall === undefined
      	? true
				: false,
	};
};
