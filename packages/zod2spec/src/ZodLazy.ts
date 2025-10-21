import { z } from 'zod';
import type { Converter } from './type.js';

export const ZodLazy = z.object({
	type: z.literal('lazy'),
});

export const convertZodLazy: Converter<typeof ZodLazy> = () => {
	return {};
};
