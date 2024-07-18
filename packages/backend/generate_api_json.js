import { writeFileSync } from 'node:fs';
import { loadConfig } from './built/config.js';
import { genOpenapiSpec } from './built/server/api/openapi/gen-spec.js';

const config = loadConfig();
const spec = genOpenapiSpec(config, true);

writeFileSync('./built/api.json', JSON.stringify(spec), 'utf-8');
