import type { Manifest, ManifestChunk } from './type.js';

/**
 * 公式ドキュメントのpseudo implementationを移植したもの。
 */
const getImportedChunks = (manifest: Manifest, name: string): ManifestChunk[] => {
	const seen = new Set<string>()

	const getImportedChunks = (chunk: ManifestChunk): ManifestChunk[] => {
		const chunks: ManifestChunk[] = [];

		for (const file of chunk.imports ?? []) {
			const importee = manifest[file]!;

			if (seen.has(file)) {
				continue;
			}

			seen.add(file);

			chunks.push(...getImportedChunks(importee));
			chunks.push(importee);
		}

		return chunks;
	};

	return getImportedChunks(manifest[name]!);
};

export const getFrontendData = (manifest: Manifest, entryChunkName: string): {
	stylesheets: string[];
	modules: string[];
	preloadModules: string[];
} => {
	const importedChunks = getImportedChunks(manifest, entryChunkName);

	const entryChunk = manifest[entryChunkName]!;

	const stylesheets = new Set([
		...(entryChunk.css ?? []),
		...importedChunks.flatMap((chunk) => chunk.css ?? []),
	]);

	const modules = new Set([
		entryChunk.file,
	]);

	const preloadModules = new Set([
		...importedChunks.map((chunk) => chunk.file),
	]);

	preloadModules.delete(entryChunk.file)

	return {
		stylesheets: [...stylesheets],
		modules: [...modules],
		preloadModules: [...preloadModules],
	};
};
