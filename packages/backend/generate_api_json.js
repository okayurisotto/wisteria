import { writeFileSync } from 'node:fs';
import { loadConfig } from './built/config.js';
import { generateFullOpenApiSpec } from './built/server/api/openapi/gen-spec.js';

const config = loadConfig();
const spec = generateFullOpenApiSpec(config);

writeFileSync('./built/api.json', JSON.stringify(spec), 'utf-8');
