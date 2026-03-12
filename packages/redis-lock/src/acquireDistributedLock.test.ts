import { test, expect, beforeAll, afterAll } from 'vitest';
import { Redis } from 'ioredis';
import { acquireDistributedLock } from './acquireDistributedLock';

let redis: Redis;

beforeAll(() => {
	redis = new Redis();
});

afterAll(async () => {
	await redis.quit();
});

test('acquires and releases a lock', async () => {
	const name = `test-${crypto.randomUUID()}`;
	const lock = await acquireDistributedLock(redis, name, 500, 10, 3);

	try {
		const current = await redis.get(`lock.${name}`);
		expect(current).toBeTruthy();
	} finally {
		await lock.release();
	}

	const after = await redis.get(`lock.${name}`);
	expect(after).toBeNull();
});

test('fails when lock is held and retries are exhausted', async () => {
	const name = `test-${crypto.randomUUID()}`;
	const lock = await acquireDistributedLock(redis, name, 500, 10, 3);

	try {
		const result = acquireDistributedLock(redis, name, 500, 10, 2);
		await expect(result).rejects.toThrow('Lock acquisition aborted');
	} finally {
		await lock.release();
	}
});
