/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { AbstractEndpoint } from '@/server/api/AbstractEndpoint.js';
import type { AntennasRepository } from '@/models/_.js';
import { AntennaEntityService } from '@/core/entities/AntennaEntityService.js';
import { DI } from '@/di-symbols.js';
import { z } from 'zod';
import { AntennaSchema } from '@/models/zod/antenna.js';

export const meta = {
	tags: ['antennas', 'account'],

	requireCredential: true,

	kind: 'read:account',

	res: AntennaSchema.array(),
} as const;

export const paramDef = z.object({});

@Injectable()
export default class extends AbstractEndpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.antennasRepository)
		private readonly antennasRepository: AntennasRepository,

		private readonly antennaEntityService: AntennaEntityService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const antennas = await this.antennasRepository.findBy({
				userId: me.id,
			});

			return await Promise.all(antennas.map(x => this.antennaEntityService.pack(x)));
		});
	}
}
