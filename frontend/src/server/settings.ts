import { Command } from 'commander';
import { randomUUID } from 'crypto';
import 'dotenv/config';
import { readFileSync } from 'fs';
import { join } from 'path';
import { version } from '../../package.json';
import type { LanguageSettingsRequest } from '../lib/Requests';

const program = new Command();
program
  .description('Backend server for DocuScope Write and Audit.')
  .version(version);
// .addOption(
//   new Option('-p --port <number>', 'Port to use for server.').env('PORT')
// )
program.parse();
// const options = program.opts();
export const DEV = process.env.NODE_ENV !== 'production';
export const PRODUCT = process.env.PRODUCT ?? 'myProse';
// const port = !isNaN(parseInt(options.port)) ? parseInt(options.port) : 8888;

function envInt(env: string | undefined, fallback = 0) {
  if (!env) return fallback;
  const num = parseInt(env);
  return num && !isNaN(num) ? num : fallback;
}
export const PORT = envInt(process.env.PORT, 8888);

/**
 * Retrieves value from environment variables.
 * Checks for <base>_FILE first to support docker secrets.
 */
function fromEnvFile(base: string, defaultValue?: string): string {
  const file = process.env[`${base}_FILE`];
  if (file) {
    return readFileSync(file, 'utf-8').trim();
  }
  const env = process.env[base];
  if (env) {
    return env;
  }
  return defaultValue ?? '';
}

export const SESSION_KEY = fromEnvFile('SESSION_KEY', randomUUID());
export const LTI_KEY = fromEnvFile('LTI_KEY'); // As it is shared with the LMS, it should always exist.
export const LTI_HOSTNAME = new URL(
  process.env.LTI_HOSTNAME ?? `http://localhost:${PORT}/`
);
const MONGO_HOST = process.env.MONGO_HOST ?? 'localhost:27017';
export const MONGO_DB = process.env.MONGO_DB ?? 'myprose';
const MONGO_USER = fromEnvFile('MONGO_USER');
const MONGO_PASSWORD = fromEnvFile('MONGO_PASSWORD');
export const LTI_DB = {
  url: `mongodb://${MONGO_HOST}/${MONGO_DB}?authSource=admin`,
  connection: { user: MONGO_USER, pass: MONGO_PASSWORD },
};

export const MONGO_CLIENT = `mongodb://${MONGO_USER ? `${MONGO_USER}:${MONGO_PASSWORD}@` : ''}${MONGO_HOST}/${MONGO_DB}?authSource=admin`;
export const LTI_OPTIONS = {
  devMode: DEV,
  dynReg: {
    url: LTI_HOSTNAME.toString(), // Tool Provider URL. Required field.
    name: PRODUCT, // Tool Provider name. Required field.
    logo: new URL('/logo.svg', LTI_HOSTNAME).toString(), // Tool Provider logo URL.
    description: 'myProse Editing and Review tools', // Tool Provider description.
    redirectUris: ['/launch', '/draft', '/review'].map(endpoint => new URL(endpoint, LTI_HOSTNAME).toString()), // Additional redirection URLs. The main URL is added by default.
    customParameters: { key: 'value' }, // Custom parameters.
    autoActivate: true, // Whether or not dynamically registered Platforms should be automatically activated. Defaults to false.
  },
};

const ONTOPIC_SERVER = process.env.ONTOPIC_SERVER ?? 'http://localhost:5000/';
export const ONTOPIC_URL = new URL('api/v2/ontopic', ONTOPIC_SERVER);
export const SEGMENT_URL = new URL('api/v2/segment', ONTOPIC_SERVER);

export const ANTHROPIC_API_KEY = fromEnvFile('ANTHROPIC_API_KEY');
export const ANTHROPIC_MODEL =
  process.env.ANTHROPIC_MODEL ?? 'claude-3-7-sonnet-latest';
export const ANTHROPIC_MAX_TOKENS = envInt(
  process.env.ANTHROPIC_MAX_TOKENS,
  1024
);
// export const ANTHROPIC_USER_ID = fromEnvFile('ANTHROPIC_USER_ID', 'myprose');

// Path to prompts json file // depricated
export const PROMPT_TEMPLATES_PATH =
  process.env['PROMPT_TEMPLATES'] ?? join('private', 'templates.json');
// Path to writing task definition files
export const WRITING_TASKS_PATH =
  process.env['WRITING_TASKS'] ?? join('private', 'writing_tasks');
// Path to tool settings file
export const TOOL_SETTINGS_PATH =
  process.env['TOOL_SETTINGS'] ?? join('public', 'settings', 'settings.json');
// LTI platform configuration files path
export const PLATFORMS_PATH =
  process.env['PLATFORMS'] ?? join('private', 'platforms');

// Default language to use in prompts for user_lang and target_lang
export const DEFAULT_LANGUAGE = process.env.DEFAULT_LANGUAGE ?? 'English';
export const DEFAULT_LANGUAGE_SETTINGS: LanguageSettingsRequest = {
  user_lang: DEFAULT_LANGUAGE,
  target_lang: DEFAULT_LANGUAGE,
};

const SIX_MONTHS = 60 * 60 * 24 * 30 * 6; // (seconds/minute)(minutes/hour)(hours/day)(days/month)(months)
export const EXPIRE_REVIEW_SECONDS = envInt(
  process.env.EXPIRE_REVIEW_SECONDS,
  SIX_MONTHS
);

// Identifier for the info.access category in writing task definitions that are treated as public
export const ACCESS_LEVEL = process.env.ACCESS_LEVEL ?? 'Public';
