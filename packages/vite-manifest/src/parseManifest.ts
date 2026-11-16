import z from 'zod';
import type { Manifest } from './type.js';

const manifestSchema = z.record(
	z.string(), // キー名

	// Viteの更新によってマニフェストに仕様変更があった際、きちんとエラーになるように、
	// あえて`z.strictObject()`を使い、`.passthrough()`などはしていない。
	z.strictObject({
		src: z.string().optional(),

		/**
		 * `.js`か`.css`で終わるとは限らず、`.png`や`.svg`になることもある。
		 * Viteがチャンクの種類を明確に伝えてこない以上、このプロパティの値の拡張子を読むことでしかチャンクの種類は判別できない。
		 */
		file: z.string(),

		/**
		 * `.css`で終わるはずだが、確証はない。
		 */
		css: z.array(z.string()).optional(),

		/**
		 * `.png`や`.svg`などで終わる。
		 */
		assets: z.array(z.string()).optional(),

		/**
		 * このプロパティが`true`だったからといって、JSチャンクであるとは断定できない。
		 * （`vite.config.ts`で`input`にCSSが直接指定された際、`isEntry`なCSSチャンクが作られることが確認されている。）
		 */
		isEntry: z.boolean().optional(),

		name: z.string().optional(),

		isDynamicEntry: z.boolean().optional(),

		isWorker: z.boolean().optional(),

		isWorkerEntry: z.boolean().optional(),

		/**
		 * マニフェストにおけるキー名。
		 *
		 * 当然、`.js`で終わるとは限らず、`.ts`や`.vue`になることもある。
		 * そもそもこれはキー名でしかないのだから、拡張子に依存する実装をしてはならない。
		 *
		 * このプロパティはJavaScriptチャンクにのみ存在するとなっている。
		 */
		imports: z.array(z.string()).optional(),

		/**
		 * マニフェストにおけるキー名。
		 *
		 * 当然、`.js`で終わるとは限らず、`.ts`や`.vue`になることもある。
		 * そもそもこれはキー名でしかないのだから、拡張子に依存する実装をしてはならない。
		 *
		 * このプロパティはJavaScriptチャンクにのみ存在するとなっている。
		 */
		dynamicImports: z.array(z.string()).optional(),
	})
);

export const parseManifest = (data: unknown): Manifest => {
	return manifestSchema.parse(data) as Manifest;
};
