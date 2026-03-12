import { setTimeout } from 'node:timers/promises';
import type Redis from 'ioredis';

const UNLOCK_SCRIPT =
	`if redis.call("get", KEYS[1]) == ARGV[1] then\n` +
	`  return redis.call("del", KEYS[1])\n` +
	`else\n` +
	`  return 0\n` +
	`end`;

export const acquireDistributedLock = async (
	client: Redis,
	name: string,
	timeoutMs: number,
	retryIntervalMs: number,
	maxRetries: number,
	signal?: AbortSignal | undefined,
) => {
	const key = `lock.${name}`;
	const value = crypto.randomUUID();

	const release = async () => {
		await client.eval(UNLOCK_SCRIPT, 1, key, value);
	};

	for (let retries = 0; retries < maxRetries && !signal?.aborted; retries++) {
		const result = await client.set(key, value, 'PX', timeoutMs, 'NX');
		if (result === 'OK') {
			return {
				release,
				[Symbol.asyncDispose]: release,
			};
		}

		await setTimeout(retryIntervalMs, undefined, { signal });
	}

	throw new Error('Lock acquisition aborted');
};
