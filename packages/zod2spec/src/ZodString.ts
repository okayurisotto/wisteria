import { z } from 'zod';
import type { Converter } from './type.js';
import type { SchemaObject } from 'openapi3-ts/oas30';

export const ZodString = z.object({
	type: z.literal('string'),
	check: z.literal('string_format').optional(),
	format: z.enum(['email', 'url', 'datetime']).optional(),
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
					check: z.literal('string_format'),
					format: z.literal('regex'),
					pattern: z.custom<RegExp>(v => v instanceof RegExp),
				}),
				z.object({
					check: z.literal('custom'),
				}),
			]),
		}),
	}).array().optional(),
});

export const convertZodString: Converter<typeof ZodString> = (result, description) => {
	return {
		type: 'string',
		...(description !== undefined
			? { description }
			: {}),
		...(
			result.check === 'string_format'
				? result.format === 'email'
					? { format: 'email' }
					: result.format === 'datetime'
						? { format: 'date-time' }
						: result.format === 'url'
							? { format: 'url' }
							: {}
				: {}
		),
		...result.checks?.map(({ _zod: { def } }) => {
			if (def.check === 'max_length') return { maxLength: def.maximum };
			if (def.check === 'min_length') return { minLength: def.minimum };
			if (def.check === 'length_equals') return { maxLength: def.length, minLength: def.length };
			if (def.check === 'string_format') return { pattern: def.pattern.source };
			if (def.check === 'custom') return {};
			return def satisfies never;
		}).reduce<SchemaObject>((prev, current) => ({ ...prev, ...current }), {}),
	};
};
