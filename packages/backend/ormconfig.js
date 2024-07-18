import { loadConfig } from './built/config.js';
import { createPostgresDataSource } from './built/postgres.js';

export default createPostgresDataSource(loadConfig());
