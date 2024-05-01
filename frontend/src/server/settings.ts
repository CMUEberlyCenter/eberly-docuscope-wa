import { Command, Option } from 'commander';
import { readFileSync } from 'fs';
// import { fileURLToPath } from 'url';
import { version } from '../../package.json';
import 'dotenv/config';


// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);

const program = new Command();
program
  .description('Backend server for DocuScope Write and Audit.')
  .version(version)
  // .addOption(
  //   new Option('-p --port <number>', 'Port to use for server.').env('PORT')
  // )
  .addOption(
    new Option('--db <string>', 'Database name')
      .env('MYSQL_DATABASE')
      .default('dswa')
  );
// .addOption(new Option("--on-topic <uri>", "OnTopic server").env("DSWA_ONTOPIC_HOST")
program.parse();
const options = program.opts();
export const DEV = process.env.NODE_ENV !== 'production'
export const PRODUCT = process.env.PRODUCT ?? 'myScribe Provider';
// const port = !isNaN(parseInt(options.port)) ? parseInt(options.port) : 8888;

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

export const LTI_KEY = fromEnvFile('LTI_KEY');
export const LTI_HOSTNAME = new URL(process.env.LTI_HOSTNAME ?? 'http://localhost:8888/');
const MONGO_HOST = process.env.MONGO_HOST ?? 'localhost:27017';
const MONGO_DB = process.env.MONGO_DB ?? 'docuscope';
const MONGO_USER = fromEnvFile('MONGO_USER');
const MONGO_PASSWORD = fromEnvFile('MONGO_PASSWORD');
export const LTI_DB = {
  url: `mongodb://${MONGO_HOST}/${MONGO_DB}?authSource=admin`,
  connection: { user: MONGO_USER, pass: MONGO_PASSWORD}
}
export const LTI_OPTIONS = {
  devMode: DEV,
  dynReg: {
    url: LTI_HOSTNAME.toString(), // Tool Provider URL. Required field.
    name: PRODUCT, // Tool Provider name. Required field.
    // logo: new URL('/', LTI_HOSTNAME).toString(), // Tool Provider logo URL.
    description: 'myScribe LTI 1.3', // Tool Provider description.
    redirectUris: [new URL('/launch', LTI_HOSTNAME).toString()], // Additional redirection URLs. The main URL is added by default.
    customParameters: { key: 'value' }, // Custom parameters.
    autoActivate: true // Whether or not dynamically registered Platforms should be automatically activated. Defaults to false.
  }
}

const MYSQL_USER = fromEnvFile('MYSQL_USER');
const MYSQL_PASSWORD = fromEnvFile('MYSQL_PASSWORD');
const MYSQL_DB = options.db ?? 'dswa';
const MYSQL_HOST = process.env.MYSQL_HOST ?? 'localhost';
const MYSQL_PORT =
  process.env.MYSQL_PORT && !isNaN(Number(process.env.MYSQL_PORT))
    ? parseInt(process.env.MYSQL_PORT)
    : 3306;
export const MYSQL_POOL = {
  host: MYSQL_HOST,
  user: MYSQL_USER,
  port: MYSQL_PORT,
  password: MYSQL_PASSWORD,
  database: MYSQL_DB,
  waitForConnections: true,
  timezone: 'Z', // makes TIMESTAMP work correctly
}
const ONTOPIC_SERVER = process.env.ONTOPIC_SERVER ?? 'http://localhost:5000/';
export const ONTOPIC_URL = new URL('api/v1', ONTOPIC_SERVER);

export const TOKEN_SECRET = fromEnvFile('TOKEN_SECRET');

export const OPENAI_API_KEY = fromEnvFile('OPENAI_API_KEY');
