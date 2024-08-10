import type { z } from 'zod';
import type { ReferenceObject, SchemaObject } from 'openapi3-ts/oas30';

export type Converter<T extends z.ZodType> = (
	result: z.infer<T>,
	recursive: (schema: z.ZodType) => SchemaObject | ReferenceObject,
) => SchemaObject | ReferenceObject;
