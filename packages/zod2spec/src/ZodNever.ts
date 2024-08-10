import { z } from 'zod';
import type { Converter } from './type.js';

export const ZodNever = z.object({
	typeName: z.literal('ZodNever'),
});

export const convertZodNever: Converter<typeof ZodNever> = () => {
	return {};
};
