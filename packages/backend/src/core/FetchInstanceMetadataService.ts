/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { URL } from 'node:url';
import { Inject, Injectable } from '@nestjs/common';
import { Browser, Document } from 'happy-dom';
import tinycolor from 'tinycolor2';
import * as Redis from 'ioredis';
import type { MiInstance } from '@/models/Instance.js';
import type { Logger } from '@/logger.js';
import { DI } from '@/di-symbols.js';
import { LoggerService } from '@/core/LoggerService.js';
import { HttpRequestService } from '@/core/HttpRequestService.js';
import { FederatedInstanceService } from '@/core/FederatedInstanceService.js';
import z from 'zod';
import * as ms from '@/misc/ms.js';
import { envOption } from '@/env.js';

// 互換性維持のためできるだけ緩く
const WellKnownSchema = z.object({
	links: z.object({
		rel: z.unknown(),
		href: z.string(),
	}).array(),
});

// 互換性維持のためできるだけ緩く
const NodeInfoSchema = z.object({
	openRegistrations: z.boolean().nullish(),
	software: z.object({
		name: z.unknown().nullish(),
		version: z.string().nullish(),
	}).nullish(),
	metadata: z.object({
		name: z.unknown().nullish(),
		nodeName: z.unknown().nullish(),
		nodeDescription: z.unknown().nullish(),
		description: z.unknown().nullish(),
		maintainer: z.object({
			name: z.string().nullish(),
			email: z.string().nullish(),
		}).nullish(),
		themeColor: z.string().nullish(),
	}).nullish(),
});

// 互換性維持のためできるだけ緩く
const ManifestSchema = z.object({
	icons: z.object({
		src: z.string().nullish(),
	}).array().nullish(),
	theme_color: z.string().nullish(),
	name: z.string().nullish(),
	short_name: z.string().nullish(),
});

type NodeInfo = z.output<typeof NodeInfoSchema>;

@Injectable()
export class FetchInstanceMetadataService {
	private readonly logger: Logger;

	constructor(
		private readonly httpRequestService: HttpRequestService,
		private readonly loggerService: LoggerService,
		private readonly federatedInstanceService: FederatedInstanceService,
		@Inject(DI.redis)
		private readonly redisClient: Redis.Redis,
	) {
		this.logger = this.loggerService.getLogger('metadata', 'cyan');
	}

	private async tryLock(host: string): Promise<boolean> {
		const mutex = await this.redisClient.set(`fetchInstanceMetadata:mutex:${host}`, '1', 'GET');
		return mutex !== '1';
	}

	private async unlock(host: string): Promise<void> {
		await this.redisClient.set(`fetchInstanceMetadata:mutex:${host}`, '0');
	}

	public async fetchInstanceMetadata(instance: MiInstance, force = false): Promise<void> {
		const host = instance.host;

		// Acquire mutex to ensure no parallel runs
		if (!await this.tryLock(host)) return;

		try {
			if (!force) {
				const _instance = await this.federatedInstanceService.fetch(host);
				const now = Date.now();
				if (_instance.infoUpdatedAt !== null && (now - _instance.infoUpdatedAt.getTime() < ms.days(1))) {
					// unlock at the finally caluse
					return;
				}
			}

			this.logger.info(`Fetching metadata of ${instance.host} ...`);

			const [info, dom, manifest] = await Promise.all([
				this.fetchNodeinfo(instance).catch(() => null),
				this.fetchDom(instance).catch(() => null),
				this.fetchManifest(instance).catch(() => null),
			]);

			const [faviconUrl, icon, themeColor, name, description] = await Promise.all([
				this.fetchFaviconUrl(instance, dom).catch(() => null),
				this.fetchIconUrl(instance, dom, manifest).catch(() => null),
				this.getThemeColor(info, dom, manifest).catch(() => null),
				this.getSiteName(info, dom, manifest).catch(() => null),
				this.getDescription(info, dom, manifest).catch(() => null),
			]);

			this.logger.succ(`Successfuly fetched metadata of ${instance.host}`);

			const updates = {
				infoUpdatedAt: new Date(),
				...(info !== null ? {
					softwareName: typeof info.software?.name === 'string' ? info.software?.name?.toLowerCase() : '?',
					softwareVersion: info.software?.version ?? null,
					openRegistrations: info.openRegistrations ?? null,
					maintainerName: info.metadata?.maintainer?.name ?? null,
					maintainerEmail: info.metadata?.maintainer?.email ?? null,
				} : {}),
				...(name ? { name } : {}),
				...(description ? { description } : {}),
				...(icon ?? faviconUrl ? { iconUrl: (icon && !icon.includes('data:image/png;base64')) ? icon : faviconUrl } : {}),
				...(faviconUrl ? { faviconUrl } : {}),
				...(themeColor ? { themeColor } : {}),
			};

			await this.federatedInstanceService.update(instance.id, updates);

			this.logger.succ(`Successfuly updated metadata of ${instance.host}`);
		} catch (e) {
			this.logger.error(`Failed to update metadata of ${instance.host}: ${e}`);
		} finally {
			await this.unlock(host);
		}
	}

	private async fetchNodeinfo(instance: MiInstance): Promise<NodeInfo> {
		this.logger.info(`Fetching nodeinfo of ${instance.host} ...`);

		try {
			let _wellknown: unknown;

			try {
				_wellknown = await this.httpRequestService.getJson(`${envOption.isProduction ? 'https' : 'http'}://${instance.host}/.well-known/nodeinfo`);
			} catch (err: unknown) {
				if (err.statusCode === 404) {
					throw new Error('No nodeinfo provided');
				} else {
					throw err.statusCode ?? err.message;
				}
			}

			const wellknown = (await WellKnownSchema.safeParseAsync(_wellknown)).data;
			if (wellknown === undefined) throw new Error('invalid wellknown');

			const links = wellknown.links;

			const link1_0 = links.find(link => link.rel === 'http://nodeinfo.diaspora.software/ns/schema/1.0');
			const link2_0 = links.find(link => link.rel === 'http://nodeinfo.diaspora.software/ns/schema/2.0');
			const link2_1 = links.find(link => link.rel === 'http://nodeinfo.diaspora.software/ns/schema/2.1');
			const link = link2_1 ?? link2_0 ?? link1_0;

			if (link === undefined) {
				throw new Error('No nodeinfo link provided');
			}

			let _nodeinfo: unknown;

			try {
				_nodeinfo = await this.httpRequestService.getJson(link.href);
			} catch (err) {
				throw err.statusCode ?? err.message;
			}

			this.logger.succ(`Successfuly fetched nodeinfo of ${instance.host}`);

			const nodeinfo = (await NodeInfoSchema.safeParseAsync(_nodeinfo)).data;
			if (nodeinfo === undefined) throw new Error('invalid nodeinfo');

			return nodeinfo;
		} catch (err) {
			this.logger.error(`Failed to fetch nodeinfo of ${instance.host}: ${err}`);

			throw err;
		}
	}

	private async fetchDom(instance: MiInstance): Promise<Document> {
		this.logger.info(`Fetching HTML of ${instance.host} ...`);

		const url = `${envOption.isProduction ? 'https' : 'http'}://${instance.host}`;

		const html = await this.httpRequestService.getHtml(url);

		const browser = new Browser();
		const page = browser.newPage();
		page.url = url;
		page.content = html;
		const doc = page.mainFrame.document;

		return doc;
	}

	private async fetchManifest(instance: MiInstance): Promise<z.output<typeof ManifestSchema> | null> {
		const url = `${envOption.isProduction ? 'https' : 'http'}://${instance.host}`;

		const manifestUrl = `${url}/manifest.json`;

		const manifest = await this.httpRequestService.getJson(manifestUrl);

		return ManifestSchema.nullable().parse(manifest);
	}

	private async fetchFaviconUrl(instance: MiInstance, doc: Document | null): Promise<string | null> {
		const url = `${envOption.isProduction ? 'https' : 'http'}://${instance.host}`;

		if (doc) {
			// https://github.com/misskey-dev/misskey/pull/8220#issuecomment-1025104043
			const href = Array.from(doc.getElementsByTagName('link')).reverse().find(link => link.relList.contains('icon'))?.href;

			if (href) {
				return (new URL(href, url)).href;
			}
		}

		const faviconUrl = `${url}/favicon.ico`;

		const favicon = await this.httpRequestService.send(faviconUrl, {
			method: 'HEAD',
		}, { throwErrorWhenResponseNotOk: false });

		if (favicon.ok) {
			return faviconUrl;
		}

		return null;
	}

	private async fetchIconUrl(instance: MiInstance, doc: Document | null, manifest: z.output<typeof ManifestSchema> | null): Promise<string | null> {
		if (manifest?.icons && manifest.icons.length > 0 && manifest.icons[0]?.src) {
			const baseurl = `https://${instance.host}`;
			return (new URL(manifest.icons[0].src, baseurl)).href;
		}

		if (doc) {
			const url = `https://${instance.host}`;

			// https://github.com/misskey-dev/misskey/pull/8220#issuecomment-1025104043
			const links = Array.from(doc.getElementsByTagName('link')).reverse();
			// https://github.com/misskey-dev/misskey/pull/8220/files/0ec4eba22a914e31b86874f12448f88b3e58dd5a#r796487559
			const href =
				[
					links.find(link => link.relList.contains('apple-touch-icon-precomposed'))?.href,
					links.find(link => link.relList.contains('apple-touch-icon'))?.href,
					links.find(link => link.relList.contains('icon'))?.href,
				]
					.find(href => href);

			if (href) {
				return (new URL(href, url)).href;
			}
		}

		return null;
	}

	private async getThemeColor(info: NodeInfo | null, doc: Document | null, manifest: z.output<typeof ManifestSchema> | null): Promise<string | null> {
		const themeColor = info?.metadata?.themeColor ?? doc?.querySelector('meta[name="theme-color"]')?.getAttribute('content') ?? manifest?.theme_color;

		if (themeColor) {
			const color = new tinycolor(themeColor);
			if (color.isValid()) return color.toHexString();
		}

		return null;
	}

	private async getSiteName(info: NodeInfo | null, doc: Document | null, manifest: z.output<typeof ManifestSchema> | null): Promise<string | null> {
		if (info?.metadata) {
			if (typeof info.metadata.nodeName === 'string') {
				return info.metadata.nodeName;
			} else if (typeof info.metadata.name === 'string') {
				return info.metadata.name;
			}
		}

		if (doc) {
			const og = doc.querySelector('meta[property="og:title"]')?.getAttribute('content');

			if (og) {
				return og;
			}
		}

		if (manifest) {
			return manifest.name ?? manifest.short_name ?? null;
		}

		return null;
	}

	private async getDescription(info: NodeInfo | null, doc: Document | null, manifest: z.output<typeof ManifestSchema> | null): Promise<string | null> {
		if (info?.metadata) {
			if (typeof info.metadata.nodeDescription === 'string') {
				return info.metadata.nodeDescription;
			} else if (typeof info.metadata.description === 'string') {
				return info.metadata.description;
			}
		}

		if (doc) {
			const meta = doc.querySelector('meta[name="description"]')?.getAttribute('content');
			if (meta) {
				return meta;
			}

			const og = doc.querySelector('meta[property="og:description"]')?.getAttribute('content');
			if (og) {
				return og;
			}
		}

		if (manifest) {
			return manifest.name ?? manifest.short_name ?? null;
		}

		return null;
	}
}
