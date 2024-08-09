import { z } from 'zod';

export const SigninSchema = z
	.object({
		id: z.string(),
		createdAt: z.string() /* format: date-time */,
		ip: z.string(),
		headers: z.record(z.string(), z.unknown()),
		success: z.boolean(),
	})
	.strict();
