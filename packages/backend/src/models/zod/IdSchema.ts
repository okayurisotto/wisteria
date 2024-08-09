import { z } from 'zod';

export const IdSchema = z.string().regex(/^[a-zA-Z0-9]+$/);
