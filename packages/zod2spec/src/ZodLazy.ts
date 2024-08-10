import { z } from 'zod';
import type { Converter } from './type.js';

export const ZodLazy = z.object({
	typeName: z.literal('ZodLazy'),
});

export const convertZodLazy: Converter<typeof ZodLazy> = () => {
	return {};
};
