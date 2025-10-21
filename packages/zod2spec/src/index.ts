import { z } from 'zod';
import type { ReferenceObject, SchemaObject } from 'openapi3-ts/oas30';
import { key } from './const.js';
import { ZodAny, convertZodAny } from './ZodAny.js';
import { ZodArray, convertZodArray } from './ZodArray.js';
import { ZodBoolean, convertZodBoolean } from './ZodBoolean.js';
import { ZodDefault, convertZodDefault } from './ZodDefault.js';
import { ZodEffects, convertZodEffects } from './ZodEffects.js';
import { ZodEnum, convertZodEnum } from './ZodEnum.js';
import { ZodLazy, convertZodLazy } from './ZodLazy.js';
import { ZodLiteral, convertZodLiteral } from './ZodLiteral.js';
import { ZodNull, convertZodNull } from './ZodNull.js';
import { ZodNullable, convertZodNullable } from './ZodNullable.js';
import { ZodNumber, convertZodNumber } from './ZodNumber.js';
import { ZodObject, convertZodObject } from './ZodObject.js';
import { ZodOptional, convertZodOptional } from './ZodOptional.js';
import { ZodRecord, convertZodRecord } from './ZodRecord.js';
import { ZodString, convertZodString } from './ZodString.js';
import { ZodUnion, convertZodUnion } from './ZodUnion.js';
import { ZodUnknown, convertZodUnknown } from './ZodUnknown.js';
import { convertZodDiscriminatedUnion, ZodDiscriminatedUnion } from './ZodDiscriminatedUnion.ts';
import { convertZodNever, ZodNever } from './ZodNever.ts';
import { convertZodIntersection, ZodIntersection } from './ZodIntersection.ts';

export const defineOpenApiSpec = <T extends z.ZodTypeAny | z.ZodRecord>(
	schema: T,
	spec: SchemaObject | ReferenceObject,
): T => {
	(schema as any)[key] = spec;
	return schema;
};

const ZodType = z.discriminatedUnion('type', [
	ZodAny,
	ZodArray,
	ZodBoolean,
	ZodDefault,
	ZodEffects,
	ZodEnum,
	ZodLazy,
	ZodLiteral,
	ZodNull,
	ZodNullable,
	ZodNumber,
	ZodObject,
	ZodOptional,
	ZodRecord,
	ZodString,
	ZodUnion,
	ZodDiscriminatedUnion,
	ZodUnknown,
	ZodNever,
	ZodIntersection,
]);

export const generateOpenApiSpec = (
	components: { key: string; schema: z.ZodTypeAny }[],
) => {
	const componentMap = new Map(
		components.map(({ key, schema }) => [schema, key]),
	);

	return (schema: z.ZodTypeAny): SchemaObject | ReferenceObject => {
		if (key in schema) {
			return schema[key] as any;
		}

		const componentKey = componentMap.get(schema);
		if (componentKey !== undefined) {
			return { $ref: `#/components/schemas/${componentKey}` };
		}

		const recursive = generateOpenApiSpec(components);
		const result = ZodType.safeParse(schema.def);

		if (!result.success) {
			throw new Error(JSON.stringify({ schema, issues: result.error.issues }, undefined, 2));
		}

		const description = z.globalRegistry.get(schema)?.description;

		switch (result.data.type) {
			case 'any':
				return convertZodAny(result.data, description, recursive);
			case 'array':
				return convertZodArray(result.data, description, recursive);
			case 'boolean':
				return convertZodBoolean(result.data, description, recursive);
			case 'default':
				return convertZodDefault(result.data, description, recursive);
			case 'effects':
				return convertZodEffects(result.data, description, recursive);
			case 'enum':
				return convertZodEnum(result.data, description, recursive);
			case 'lazy':
				return convertZodLazy(result.data, description, recursive);
			case 'literal':
				return convertZodLiteral(result.data, description, recursive);
			case 'null':
				return convertZodNull(result.data, description, recursive);
			case 'nullable':
				return convertZodNullable(result.data, description, recursive);
			case 'number':
				return convertZodNumber(result.data, description, recursive);
			case 'object':
				return convertZodObject(result.data, description, recursive);
			case 'optional':
				return convertZodOptional(result.data, description, recursive);
			case 'record':
				return convertZodRecord(result.data, description, recursive);
			case 'string':
				return convertZodString(result.data, description, recursive);
			case 'union':
				return convertZodUnion(result.data, description, recursive);
			case 'discriminatedUnion':
				return convertZodDiscriminatedUnion(result.data, description, recursive);
			case 'unknown':
				return convertZodUnknown(result.data, description, recursive);
			case 'never':
				return convertZodNever(result.data, description, recursive);
			case 'intersection':
				return convertZodIntersection(result.data, description, recursive);
			default:
				return result.data satisfies never;
		}
	};
};
