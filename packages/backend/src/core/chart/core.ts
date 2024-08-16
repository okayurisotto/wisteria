/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/**
 * チャートエンジン
 */

import { EntitySchema } from 'typeorm';

const COLUMN_PREFIX = '___';
const UNIQUE_TEMP_COLUMN_PREFIX = 'unique_temp___';
const COLUMN_DELIMITER = '_';

type Schema = Record<string, {
	uniqueIncrement?: boolean;

	intersection?: string[] | ReadonlyArray<string>;

	range?: 'big' | 'small' | 'medium';

	// previousな値を引き継ぐかどうか
	accumulate?: boolean;
}>;

const camelToSnake = (str: string): string => {
	return str.replace(/([A-Z])/g, s => '_' + s.charAt(0).toLowerCase());
};

/**
 * 様々なチャートの管理を司るクラス
 */
export default abstract class Chart {
	private static convertSchemaToColumnDefinitions(schema: Schema): Record<string, { type: string; array?: boolean; default?: any }> {
		const columns = {} as Record<string, { type: string; array?: boolean; default?: any }>;
		for (const [k, v] of Object.entries(schema)) {
			const name = k.replaceAll('.', COLUMN_DELIMITER);
			const type = v.range === 'big' ? 'bigint' : v.range === 'small' ? 'smallint' : 'integer';
			if (v.uniqueIncrement) {
				columns[UNIQUE_TEMP_COLUMN_PREFIX + name] = {
					type: 'varchar',
					array: true,
					default: '{}',
				};
				columns[COLUMN_PREFIX + name] = {
					type,
					default: 0,
				};
			} else {
				columns[COLUMN_PREFIX + name] = {
					type,
					default: 0,
				};
			}
		}
		return columns;
	}

	public static schemaToEntity(name: string, schema: Schema, grouped = false): {
		hour: EntitySchema;
		day: EntitySchema;
	} {
		const createEntity = (span: 'hour' | 'day'): EntitySchema => new EntitySchema({
			name:
				span === 'hour'
					? `__chart__${camelToSnake(name)}`
					: span === 'day'
						? `__chart_day__${camelToSnake(name)}`
						: new Error('not happen') as never,
			columns: {
				id: {
					type: 'integer',
					primary: true,
					generated: true,
				},
				date: {
					type: 'integer',
				},
				...(grouped
					? {
							group: {
								type: 'varchar',
								length: 128,
							},
						}
					: {}),
				...Chart.convertSchemaToColumnDefinitions(schema),
			},
			indices: [{
				columns: grouped ? ['date', 'group'] : ['date'],
				unique: true,
			}],
			uniques: [{
				columns: grouped ? ['date', 'group'] : ['date'],
			}],
			relations: {
				/* TODO
					group: {
						target: () => Foo,
						type: 'many-to-one',
						onDelete: 'CASCADE',
					},
				*/
			},
		});

		return {
			hour: createEntity('hour'),
			day: createEntity('day'),
		};
	}
}
