/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as fs from 'node:fs';
import * as yaml from 'js-yaml';
import type { RedisOptions } from 'ioredis';
import { z } from 'zod';
import { PACKAGE_JSON_FILE, FRONTEND_MANIFEST_FILE, CONFIG_FILE } from './path.js';
import { envOption } from './env.js';

const metaSchema = z.object({
	version: z.string(),
});

const frontendManifestSchema = z.object({
	'src/_boot_.ts': z.object({
		file: z.string(),
		css: z.string().array().optional(),
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
}).strict();

const configSchema = z.object({
	url: z.string().url(),
	port: z.number().optional().default(3000),
	disableHsts: z.boolean().default(false),
	db: z.object({
		host: z.string(),
		port: z.number(),
		db: z.string(),
		user: z.string(),
		pass: z.string(),
		disableCache: z.boolean().optional(),
		extra: z.record(z.string(), z.string()).optional(),
	}).strict(),
	dbReplications: z.boolean().default(false),
	dbSlaves: z.object({
		host: z.string(),
		port: z.number(),
		db: z.string(),
		user: z.string(),
		pass: z.string(),
	}).strict().array().default([]),
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
	}).strict().optional(),

	publishTarballInsteadOfProvideRepositoryUrl: z.boolean().default(false),

	proxy: z.string().url().optional(),
	proxySmtp: z.string().optional(),
	proxyBypassHosts: z.string().array().default([]),

	allowedPrivateNetworks: z.string().array().default([]),

	maxFileSize: z.number().default(262144000),

	id: z.enum(['aid', 'aidx', 'meid', 'meidg', 'ulid', 'objectid']),

	outgoingAddress: z.string().optional(),

	deliverJobConcurrency: z.number().default(128),
	inboxJobConcurrency: z.number().default(16),
	relationshipJobConcurrency: z.number().default(16),
	deliverJobPerSec: z.number().default(128),
	inboxJobPerSec: z.number().default(32),
	relationshipJobPerSec: z.number().default(64),
	deliverJobMaxAttempts: z.number().default(12),
	inboxJobMaxAttempts: z.number().default(8),

	mediaProxy: z.string().url().transform((v) => {
		if (v.endsWith('/')) return v.substring(0, v.length - 1);
		return v;
	}).optional(),
	proxyRemoteFiles: z.boolean().default(false),
	videoThumbnailGenerator: z.string().url().transform((v) => {
		if (v.endsWith('/')) return v.substring(0, v.length - 1);
		return v;
	}).optional(),

	signToActivityPubGet: z.boolean().default(false),

	perUserNotificationsMaxCount: z.number().default(500),
	deactivateAntennaThreshold: z.number().default(1000 * 60 * 60 * 24 * 7),
	pidFile: z.string().optional(),

	prometheus: z.object({
		basicAuth: z.object({
			username: z.string(),
			password: z.string(),
		}).strict(),
	}).strict().optional(),
}).strict();

export type Config = ReturnType<typeof loadConfig>;

export const loadConfig = () => {
	const meta = metaSchema.parse(JSON.parse(fs.readFileSync(PACKAGE_JSON_FILE, 'utf-8')));

	const clientManifestExists = fs.existsSync(FRONTEND_MANIFEST_FILE);
	const clientManifest = clientManifestExists
		? frontendManifestSchema.parse(JSON.parse(fs.readFileSync(FRONTEND_MANIFEST_FILE, 'utf-8')))
		: { 'src/_boot_.ts': { file: 'src/_boot_.ts' } };

	const config = configSchema.parse(yaml.load(fs.readFileSync(CONFIG_FILE, 'utf-8')));

	const url = new URL(config.url);
	const version = meta.version;
	const host = url.host;
	const hostname = url.hostname;
	const scheme = url.protocol.replace(/:$/, '');

	const externalMediaProxy = config.mediaProxy ?? null;
	const internalMediaProxy = `${scheme}://${host}/proxy`;
	const redis = {
		...config.redis.extra,
		...convertRedisOptions(config.redis, host),
	};

	return {
		version,
		publishTarballInsteadOfProvideRepositoryUrl: config.publishTarballInsteadOfProvideRepositoryUrl,
		url: url.origin,
		port: envOption.PORT ?? config.port,
		disableHsts: config.disableHsts,
		host,
		hostname,
		scheme,
		apiUrl: `${scheme}://${host}/api`,
		authUrl: `${scheme}://${host}/auth`,
		db: config.db,
		dbReplications: config.dbReplications,
		dbSlaves: config.dbSlaves,
		meilisearch: config.meilisearch,
		redis,
		redisForPubsub: config.redisForPubsub !== undefined
			? { ...config.redisForPubsub.extra, ...convertRedisOptions(config.redisForPubsub, host) }
			: redis,
		redisForJobQueue: config.redisForJobQueue !== undefined
			? { ...config.redisForJobQueue.extra, ...convertRedisOptions(config.redisForJobQueue, host) }
			: redis,
		redisForTimelines: config.redisForTimelines !== undefined
			? { ...config.redisForTimelines.extra, ...convertRedisOptions(config.redisForTimelines, host) }
			: redis,
		id: config.id,
		proxy: config.proxy,
		proxySmtp: config.proxySmtp,
		proxyBypassHosts: config.proxyBypassHosts,
		allowedPrivateNetworks: config.allowedPrivateNetworks,
		maxFileSize: config.maxFileSize,
		outgoingAddress: config.outgoingAddress,
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
		videoThumbnailGenerator: config.videoThumbnailGenerator ?? null,
		userAgent: `Misskey/${version} (${config.url})`,
		clientEntry: clientManifest['src/_boot_.ts'],
		perUserNotificationsMaxCount: config.perUserNotificationsMaxCount,
		deactivateAntennaThreshold: config.deactivateAntennaThreshold,
		pidFile: config.pidFile,
		prometheus: config.prometheus,
	} as const;
};

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
