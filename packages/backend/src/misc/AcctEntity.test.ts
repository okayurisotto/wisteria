import { suite, test } from 'node:test';
import { deepStrictEqual, strictEqual } from 'node:assert/strict';
import { AcctEntity } from './AcctEntity.js';

void suite('AcctEntity.from()', () => {
	void suite('@alice from local.example.com', () => {
		const acct = AcctEntity.from('alice', null, 'local.example.com');

		void test('properties', () => {
			strictEqual(acct.username, 'alice');
			strictEqual(acct.host, null);
			strictEqual(acct.localHost, 'local.example.com');
			strictEqual(acct.omitted, true);
		});

		void test('toAcctURI()', () => {
			strictEqual(acct.toAcctURI(), 'acct:alice@local.example.com');
		});

		void test('toShortString()', () => {
			strictEqual(acct.toShortString(), '@alice');
		});

		void test('toLongString()', () => {
			strictEqual(acct.toLongString(), '@alice@local.example.com');
		});

		void test('toLongStringLegacy()', () => {
			strictEqual(acct.toLongStringLegacy(), 'alice@local.example.com');
		});
	});

	void suite('@alice@local.example.com from local.example.com', () => {
		const acct = AcctEntity.from(
			'alice',
			'local.example.com',
			'local.example.com',
		);

		void test('properties', () => {
			strictEqual(acct.username, 'alice');
			strictEqual(acct.host, null);
			strictEqual(acct.localHost, 'local.example.com');
			strictEqual(acct.omitted, false);
		});

		void test('toAcctURI()', () => {
			strictEqual(acct.toAcctURI(), 'acct:alice@local.example.com');
		});

		void test('toShortString()', () => {
			strictEqual(acct.toShortString(), '@alice');
		});

		void test('toLongString()', () => {
			strictEqual(acct.toLongString(), '@alice@local.example.com');
		});

		void test('toLongStringLegacy()', () => {
			strictEqual(acct.toLongStringLegacy(), 'alice@local.example.com');
		});
	});

	void suite('@alice@remote.example.com from local.example.com', () => {
		const acct = AcctEntity.from(
			'alice',
			'remote.example.com',
			'local.example.com',
		);

		void test('properties', () => {
			strictEqual(acct.username, 'alice');
			strictEqual(acct.host, 'remote.example.com');
			strictEqual(acct.omitted, false);
			strictEqual(acct.localHost, 'local.example.com');
		});

		void test('toAcctURI()', () => {
			strictEqual(acct.toAcctURI(), 'acct:alice@remote.example.com');
		});

		void test('toShortString()', () => {
			strictEqual(acct.toShortString(), null);
		});

		void test('toLongString()', () => {
			strictEqual(acct.toLongString(), '@alice@remote.example.com');
		});

		void test('toLongStringLegacy()', () => {
			strictEqual(acct.toLongStringLegacy(), 'alice@remote.example.com');
		});
	});
});

void suite('AcctEntity.parse()', () => {
	void suite('starts with @', () => {
		void test('@alice from local.example.com', () => {
			const acct = AcctEntity.parse('@alice', 'local.example.com');
			deepStrictEqual(
				acct,
				AcctEntity.from('alice', null, 'local.example.com'),
			);
		});

		void test('@alice@local.example.com from local.example.com', () => {
			const acct = AcctEntity.parse(
				'@alice@local.example.com',
				'local.example.com',
			);
			deepStrictEqual(
				acct,
				AcctEntity.from('alice', 'local.example.com', 'local.example.com'),
			);
		});

		void test('@alice@remote.example.com from local.example.com', () => {
			const acct = AcctEntity.parse(
				'@alice@remote.example.com',
				'local.example.com',
			);
			deepStrictEqual(
				acct,
				AcctEntity.from('alice', 'remote.example.com', 'local.example.com'),
			);
		});
	});

	void suite('not starts with @', () => {
		void test('@alice from local.example.com', () => {
			const acct = AcctEntity.parse('alice', 'local.example.com');
			deepStrictEqual(
				acct,
				AcctEntity.from('alice', null, 'local.example.com'),
			);
		});

		void test('alice@local.example.com from local.example.com', () => {
			const acct = AcctEntity.parse(
				'alice@local.example.com',
				'local.example.com',
			);
			deepStrictEqual(
				acct,
				AcctEntity.from('alice', 'local.example.com', 'local.example.com'),
			);
		});

		void test('alice@remote.example.com from local.example.com', () => {
			const acct = AcctEntity.parse(
				'alice@remote.example.com',
				'local.example.com',
			);
			deepStrictEqual(
				acct,
				AcctEntity.from('alice', 'remote.example.com', 'local.example.com'),
			);
		});
	});
});

void suite('AcctEntity.is()', () => {
	void test('@alice@local.example.com and @alice@local.example.com', () => {
		const a = AcctEntity.from('alice', null, 'local.example.com');
		const b = AcctEntity.from(
			'alice',
			'local.example.com',
			'local.example.com',
		);
		strictEqual(a.is(b), true);
	});

	void test('@alice on local.example.com and @alice@local.example.com', () => {
		const a = AcctEntity.from('alice', null, 'local.example.com');
		const b = AcctEntity.from(
			'alice',
			'local.example.com',
			'local.example.com',
		);
		strictEqual(a.is(b), true);
	});

	void test('@alice on local.example.com and @bob on local.example.com', () => {
		const a = AcctEntity.from('alice', null, 'local.example.com');
		const b = AcctEntity.from('bob', null, 'local.example.com');
		strictEqual(a.is(b), false);
	});

	void test('@alice on local.example.com and @alice@remote.example.com', () => {
		const a = AcctEntity.from('alice', null, 'local.example.com');
		const b = AcctEntity.from(
			'alice',
			'remote.example.com',
			'local.example.com',
		);
		strictEqual(a.is(b), false);
	});
});
