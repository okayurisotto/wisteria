import { z } from 'zod';
import type { Converter } from './type.js';

export const ZodArray = z.object({
	type: z.literal('array'),
	element: z.custom<z.ZodCustom>(),
	checks: z.object({
		_zod: z.object({
			def: z.discriminatedUnion('check', [
				z.object({
					check: z.literal('min_length'),
					minimum: z.number().int().nonnegative(),
				}),
				z.object({
					check: z.literal('max_length'),
					maximum: z.number().int().nonnegative(),
				}),
				z.object({
					check: z.literal('length_equals'),
					length: z.number().int().nonnegative(),
				}),
				z.object({
					check: z.literal('custom'),
				}),
			]),
		}),
	}).array().optional(),
});

export const convertZodArray: Converter<typeof ZodArray> = (
	result,
	description,
	recursive,
) => {
	return {
		type: 'array',
		...(description !== undefined
			? { description }
			: {}),
		items: recursive(result.element),
		...result.checks?.map(({ _zod: { def: def } }) => {
			if (def.check === 'min_length') return { minItems: def.minimum };
			if (def.check === 'max_length') return { maxItems: def.maximum };
			if (def.check === 'length_equals') return { minItems: def.length, maxItems: def.length };
			if (def.check === 'custom') return {};
			return def satisfies never;
		}).reduce((prev, current) => ({ ...prev, ...current }), {}),
	};
};
