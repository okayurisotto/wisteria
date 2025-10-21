import { z } from 'zod';
import type { Converter } from './type.js';

export const ZodNever = z.object({
	type: z.literal('never'),
});

export const convertZodNever: Converter<typeof ZodNever> = () => {
	return {};
};
