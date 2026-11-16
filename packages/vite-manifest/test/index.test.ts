import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'vitest';
import { parseManifest, getFrontendData } from '../src/index.js';

const entryChunkName = 'src/_boot_.ts';
const manifestFilePath = path.join(import.meta.dirname, './manifest.json');
const manifestFileContent = await fs.readFile(manifestFilePath, { encoding: 'utf-8' });
const rawManifest = JSON.parse(manifestFileContent);

test('getFrontendData', () => {
	getFrontendData(parseManifest(rawManifest), entryChunkName);
});
