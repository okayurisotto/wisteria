import { z } from 'zod';
import type { Converter } from './type.js';

export const ZodNumber = z.object({
	type: z.literal('number'),
	checks: z.object({
		_zod: z.object({
			def: z.discriminatedUnion('check', [
				z.object({
					check: z.literal('greater_than'),
					value: z.number(),
					inclusive: z.boolean(),
				}),
				z.object({
					check: z.literal('less_than'),
					value: z.number(),
					inclusive: z.boolean(),
				}),
				z.object({
					check: z.literal('number_format'),
					format: z.enum(['safeint']),
				}),
				z.object({
					check: z.literal('custom'),
				}),
			]),
		}),
	}).array().optional(),
});

export const convertZodNumber: Converter<typeof ZodNumber> = (result, description) => {
	const isInt = result.checks?.some(({ _zod: { def } }) => {
		return def.check === 'number_format' && def.format === 'safeint';
	}) ?? false;

	return {
		type: isInt ? 'integer' : 'number',
		...(description !== undefined
			? { description }
			: {}),
		...result.checks?.map(({ _zod: { def } }) => {
			if (def.check === 'greater_than') return { minimum: def.value, exclusiveMinimum: !def.inclusive };
			if (def.check === 'less_than') return { maximum: def.value, exclusiveMaximum: !def.inclusive };
			if (def.check === 'number_format') return {};
			if (def.check === 'custom') return {};
			return def satisfies never;
		}).reduce((prev, current) => ({ ...prev, ...current }), {}),
	};
};
