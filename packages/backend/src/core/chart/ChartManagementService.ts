/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';

import FederationChart from './charts/federation.js';
import NotesChart from './charts/notes.js';
import UsersChart from './charts/users.js';
import ActiveUsersChart from './charts/active-users.js';
import InstanceChart from './charts/instance.js';
import PerUserNotesChart from './charts/per-user-notes.js';
import PerUserPvChart from './charts/per-user-pv.js';
import DriveChart from './charts/drive.js';
import PerUserReactionsChart from './charts/per-user-reactions.js';
import PerUserFollowingChart from './charts/per-user-following.js';
import PerUserDriveChart from './charts/per-user-drive.js';
import ApRequestChart from './charts/ap-request.js';
import type { OnApplicationShutdown } from '@nestjs/common';
import { envOption } from '@/env.js';

@Injectable()
export class ChartManagementService implements OnApplicationShutdown {
	private charts;
	private saveIntervalId: NodeJS.Timeout;

	constructor(
		federationChart: FederationChart,
		notesChart: NotesChart,
		usersChart: UsersChart,
		activeUsersChart: ActiveUsersChart,
		instanceChart: InstanceChart,
		perUserNotesChart: PerUserNotesChart,
		perUserPvChart: PerUserPvChart,
		driveChart: DriveChart,
		perUserReactionsChart: PerUserReactionsChart,
		perUserFollowingChart: PerUserFollowingChart,
		perUserDriveChart: PerUserDriveChart,
		apRequestChart: ApRequestChart,
	) {
		this.charts = [
			federationChart,
			notesChart,
			usersChart,
			activeUsersChart,
			instanceChart,
			perUserNotesChart,
			perUserPvChart,
			driveChart,
			perUserReactionsChart,
			perUserFollowingChart,
			perUserDriveChart,
			apRequestChart,
		];
	}

	public start() {
		// 20分おきにメモリ情報をDBに書き込み
		this.saveIntervalId = setInterval(() => {
			for (const chart of this.charts) {
				chart.save();
			}
		}, 1000 * 60 * 20);
	}

	public async dispose(): Promise<void> {
		clearInterval(this.saveIntervalId);
		if (!envOption.isTest) {
			await Promise.all(
				this.charts.map(chart => chart.save()),
			);
		}
	}

	async onApplicationShutdown(signal: string): Promise<void> {
		await this.dispose();
	}
}
