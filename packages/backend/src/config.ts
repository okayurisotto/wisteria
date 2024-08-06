/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as fs from 'node:fs';
import * as yaml from 'js-yaml';
import type { RedisOptions } from 'ioredis';
import { z } from 'zod';
import { META_FILE, FRONTEND_MANIFEST_FILE, CONFIG_FILE } from './path.js';
import { envOption } from './env.js';

const metaSchema = z.object({
	version: z.string(),
});

const frontendManifestSchema = z.object({
	'src/_boot_.ts': z.object({
		file: z.string(),
	}),
});

const redisConfigSchema = z.object({
	host: z.string(),
	port: z.number(),
	family: z.number().optional(),
	pass: z.string().optional(),
	db: z.number().optional(),
	prefix: z.string().optional(),
	extra: z.record(z.string(), z.unknown()).optional(),
});

const configSchema = z.object({
	url: z.string(),
	port: z.number().optional(),
	disableHsts: z.boolean().optional(),
	db: z.object({
		host: z.string(),
		port: z.number(),
		db: z.string(),
		user: z.string(),
		pass: z.string(),
		disableCache: z.boolean().optional(),
		extra: z.record(z.string(), z.string()).optional(),
	}),
	dbReplications: z.boolean().optional(),
	dbSlaves: z.object({
		host: z.string(),
		port: z.number(),
		db: z.string(),
		user: z.string(),
		pass: z.string(),
	}).array().optional(),
	redis: redisConfigSchema,
	redisForPubsub: redisConfigSchema.optional(),
	redisForJobQueue: redisConfigSchema.optional(),
	redisForTimelines: redisConfigSchema.optional(),
	meilisearch: z.object({
		host: z.string(),
		port: z.string(),
		apiKey: z.string(),
		ssl: z.boolean().optional(),
		index: z.string(),
		scope: z.enum(['local', 'global']).or(z.string().array()).optional(),
	}).optional(),

	publishTarballInsteadOfProvideRepositoryUrl: z.boolean().optional(),

	proxy: z.string().optional(),
	proxySmtp: z.string().optional(),
	proxyBypassHosts: z.string().array().optional(),

	allowedPrivateNetworks: z.string().array().optional(),

	maxFileSize: z.number().optional(),

	id: z.string(),

	outgoingAddress: z.string().optional(),
	outgoingAddressFamily: z.enum(['ipv4', 'ipv6', 'dual']).optional(),

	deliverJobConcurrency: z.number().optional(),
	inboxJobConcurrency: z.number().optional(),
	relationshipJobConcurrency: z.number().optional(),
	deliverJobPerSec: z.number().optional(),
	inboxJobPerSec: z.number().optional(),
	relationshipJobPerSec: z.number().optional(),
	deliverJobMaxAttempts: z.number().optional(),
	inboxJobMaxAttempts: z.number().optional(),

	mediaProxy: z.string().optional(),
	proxyRemoteFiles: z.boolean().optional(),
	videoThumbnailGenerator: z.string().optional(),

	signToActivityPubGet: z.boolean().optional(),

	perChannelMaxNoteCacheCount: z.number().optional(),
	perUserNotificationsMaxCount: z.number().optional(),
	deactivateAntennaThreshold: z.number().optional(),
	pidFile: z.string().optional(),
});

export type Config = {
	url: string;
	port: number;
	disableHsts: boolean | undefined;
	db: {
		host: string;
		port: number;
		db: string;
		user: string;
		pass: string;
		disableCache?: boolean | undefined;
		extra?: { [x: string]: string } | undefined;
	};
	dbReplications: boolean | undefined;
	dbSlaves: {
		host: string;
		port: number;
		db: string;
		user: string;
		pass: string;
	}[] | undefined;
	meilisearch: {
		host: string;
		port: string;
		apiKey: string;
		ssl?: boolean | undefined;
		index: string;
		scope?: 'local' | 'global' | string[] | undefined;
	} | undefined;
	proxy: string | undefined;
	proxySmtp: string | undefined;
	proxyBypassHosts: string[] | undefined;
	allowedPrivateNetworks: string[] | undefined;
	maxFileSize: number | undefined;
	id: string;
	outgoingAddress: string | undefined;
	outgoingAddressFamily: 'ipv4' | 'ipv6' | 'dual' | undefined;
	deliverJobConcurrency: number | undefined;
	inboxJobConcurrency: number | undefined;
	relationshipJobConcurrency: number | undefined;
	deliverJobPerSec: number | undefined;
	inboxJobPerSec: number | undefined;
	relationshipJobPerSec: number | undefined;
	deliverJobMaxAttempts: number | undefined;
	inboxJobMaxAttempts: number | undefined;
	proxyRemoteFiles: boolean | undefined;
	signToActivityPubGet: boolean | undefined;

	version: string;
	publishTarballInsteadOfProvideRepositoryUrl: boolean;
	host: string;
	hostname: string;
	scheme: string;
	wsScheme: string;
	apiUrl: string;
	wsUrl: string;
	authUrl: string;
	driveUrl: string;
	userAgent: string;
	clientEntry: z.infer<typeof frontendManifestSchema>['src/_boot_.ts'];
	clientManifestExists: boolean;
	mediaProxy: string;
	externalMediaProxyEnabled: boolean;
	videoThumbnailGenerator: string | null;
	redis: RedisOptions;
	redisForPubsub: RedisOptions;
	redisForJobQueue: RedisOptions;
	redisForTimelines: RedisOptions;
	perChannelMaxNoteCacheCount: number;
	perUserNotificationsMaxCount: number;
	deactivateAntennaThreshold: number;
	pidFile: string | undefined;
};

export function loadConfig(): Config {
	const meta = metaSchema.parse(JSON.parse(fs.readFileSync(META_FILE, 'utf-8')));

	const clientManifestExists = fs.existsSync(FRONTEND_MANIFEST_FILE);
	const clientManifest = clientManifestExists
		? frontendManifestSchema.parse(JSON.parse(fs.readFileSync(FRONTEND_MANIFEST_FILE, 'utf-8')))
		: { 'src/_boot_.ts': { file: 'src/_boot_.ts' } };

	const config = configSchema.parse(yaml.load(fs.readFileSync(CONFIG_FILE, 'utf-8')));

	const url = tryCreateUrl(config.url);
	const version = meta.version;
	const host = url.host;
	const hostname = url.hostname;
	const scheme = url.protocol.replace(/:$/, '');
	const wsScheme = scheme.replace('http', 'ws');

	const externalMediaProxy = config.mediaProxy
		? config.mediaProxy.endsWith('/')
			? config.mediaProxy.substring(0, config.mediaProxy.length - 1)
			: config.mediaProxy
		: null;
	const internalMediaProxy = `${scheme}://${host}/proxy`;
	const redis = { ...config.redis.extra, ...convertRedisOptions(config.redis, host) };

	return {
		version,
		publishTarballInsteadOfProvideRepositoryUrl: !!config.publishTarballInsteadOfProvideRepositoryUrl,
		url: url.origin,
		port: config.port ?? envOption.PORT ?? 3000,
		disableHsts: config.disableHsts,
		host,
		hostname,
		scheme,
		wsScheme,
		wsUrl: `${wsScheme}://${host}`,
		apiUrl: `${scheme}://${host}/api`,
		authUrl: `${scheme}://${host}/auth`,
		driveUrl: `${scheme}://${host}/files`,
		db: config.db,
		dbReplications: config.dbReplications,
		dbSlaves: config.dbSlaves,
		meilisearch: config.meilisearch,
		redis,
		redisForPubsub: config.redisForPubsub
			? { ...config.redisForPubsub.extra, ...convertRedisOptions(config.redisForPubsub, host) }
			: redis,
		redisForJobQueue: config.redisForJobQueue
			? { ...config.redisForJobQueue.extra, ...convertRedisOptions(config.redisForJobQueue, host) }
			: redis,
		redisForTimelines: config.redisForTimelines
			? { ...config.redisForTimelines.extra, ...convertRedisOptions(config.redisForTimelines, host) }
			: redis,
		id: config.id,
		proxy: config.proxy,
		proxySmtp: config.proxySmtp,
		proxyBypassHosts: config.proxyBypassHosts,
		allowedPrivateNetworks: config.allowedPrivateNetworks,
		maxFileSize: config.maxFileSize,
		outgoingAddress: config.outgoingAddress,
		outgoingAddressFamily: config.outgoingAddressFamily,
		deliverJobConcurrency: config.deliverJobConcurrency,
		inboxJobConcurrency: config.inboxJobConcurrency,
		relationshipJobConcurrency: config.relationshipJobConcurrency,
		deliverJobPerSec: config.deliverJobPerSec,
		inboxJobPerSec: config.inboxJobPerSec,
		relationshipJobPerSec: config.relationshipJobPerSec,
		deliverJobMaxAttempts: config.deliverJobMaxAttempts,
		inboxJobMaxAttempts: config.inboxJobMaxAttempts,
		proxyRemoteFiles: config.proxyRemoteFiles,
		signToActivityPubGet: config.signToActivityPubGet,
		mediaProxy: externalMediaProxy ?? internalMediaProxy,
		externalMediaProxyEnabled: externalMediaProxy !== null && externalMediaProxy !== internalMediaProxy,
		videoThumbnailGenerator: config.videoThumbnailGenerator
			? config.videoThumbnailGenerator.endsWith('/') ? config.videoThumbnailGenerator.substring(0, config.videoThumbnailGenerator.length - 1) : config.videoThumbnailGenerator
			: null,
		userAgent: `Misskey/${version} (${config.url})`,
		clientEntry: clientManifest['src/_boot_.ts'],
		clientManifestExists: clientManifestExists,
		perChannelMaxNoteCacheCount: config.perChannelMaxNoteCacheCount ?? 1000,
		perUserNotificationsMaxCount: config.perUserNotificationsMaxCount ?? 500,
		deactivateAntennaThreshold: config.deactivateAntennaThreshold ?? (1000 * 60 * 60 * 24 * 7),
		pidFile: config.pidFile,
	};
}

function tryCreateUrl(url: string) {
	try {
		return new URL(url);
	} catch (e) {
		throw new Error(`url="${url}" is not a valid URL.`);
	}
}

const convertRedisOptions = (
	options: z.infer<typeof redisConfigSchema>,
	host: string,
) => ({
	host: options.host,
	port: options.port,
	...(options.pass !== undefined ? { password: options.pass } : {}),
	db: options.db ?? 0,
	family: options.family ?? 0,
	keyPrefix: `${options.prefix ?? host}:`,
} as const satisfies RedisOptions);
