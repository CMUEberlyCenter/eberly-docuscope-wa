/**
 Via:
  https://blog.logrocket.com/nodejs-expressjs-postgresql-crud-rest-api-example/
  https://node-postgres.com/features/pooling
  https://expressjs.com/en/guide/routing.html
  https://stackabuse.com/get-http-post-body-in-express-js/
  https://github.com/js-kyle/nodejs-lti-provider/blob/master/lti/index.js
  https://github.com/Cvmcosta/ltijs
*/
import { Command, Option } from 'commander';
import cors from 'cors';
import 'dotenv/config';
import express, { Request, Response } from 'express';
import fileUpload from 'express-fileupload';
import { readFileSync } from 'fs';
import jwt from 'jsonwebtoken';
import { PoolConnection, RowDataPacket, createPool } from 'mysql2/promise';
import { open } from 'node:fs/promises';
import process from 'node:process';
import { OpenAI } from 'openai';
import { dirname, join } from 'path';
import format from 'string-format';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { version } from '../../package.json';
import { ConfigurationFile, Prompt } from '../lib/Configuration';
import PrometheusMetrics from './prometheus';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const program = new Command();
program
  .description('Backend server for DocuScope Write and Audit.')
  .version(version)
  .addOption(
    new Option('-p --port <number>', 'Port to use for server.').env('PORT')
  )
  .addOption(
    new Option('--db <string>', 'Database name')
      .env('MYSQL_DATABASE')
      .default('dswa')
  );
// .addOption(new Option("--on-topic <uri>", "OnTopic server").env("DSWA_ONTOPIC_HOST")
program.parse();
const options = program.opts();
const port = !isNaN(parseInt(options.port)) ? parseInt(options.port) : 8888;
const MYSQL_DB = options.db ?? 'dswa';
const DB_HOST = process.env.DB_HOST ?? 'localhost';
const DB_PORT =
  process.env.DB_PORT && !isNaN(Number(process.env.DB_PORT))
    ? parseInt(process.env.DB_PORT)
    : 3306;

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

const MYSQL_USER = fromEnvFile('MYSQL_USER');
const MYSQL_PASSWORD = fromEnvFile('MYSQL_PASSWORD');

const ONTOPIC_HOST = process.env.DSWA_ONTOPIC_HOST ?? 'localhost';
const ONTOPIC_PORT =
  process.env.DSWA_ONTOPIC_PORT && !isNaN(Number(process.env.DSWA_ONTOPIC_PORT))
    ? parseInt(process.env.DSWA_ONTOPIC_PORT)
    : 5000;

console.log(
  `Configured the OnTopic backend url to be: ${ONTOPIC_HOST}:${ONTOPIC_PORT}`
);

const TOKEN_SECRET = fromEnvFile('TOKEN_SECRET');
/**
 * Here’s an example of a function for signing tokens:
 */
function generateAccessToken(aString: string) {
  const tSecret =
    TOKEN_SECRET === 'dummy' || TOKEN_SECRET === '' ? uuidv4() : TOKEN_SECRET;
  return jwt.sign({ payload: aString }, tSecret, { expiresIn: '1800s' });
}

const openai = new OpenAI({ apiKey: fromEnvFile('OPENAI_API_KEY') });

const pool = createPool({
  host: DB_HOST,
  user: MYSQL_USER,
  port: DB_PORT,
  password: MYSQL_PASSWORD,
  database: MYSQL_DB,
  waitForConnections: true,
  connectionLimit: 100,
  timezone: 'Z', // Makes TIMESTAMP work correctly
});

/**
 * Wait for connection to database and ensure that the expected
 * tables exist.
 */
async function initializeDatabase() {
  let connection: PoolConnection | null = null;
  while (!connection) {
    try {
      connection = await pool.getConnection();
    } catch (err) {
      if (err instanceof Error) {
        console.error(err);
        // timeout and try again.
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }
  await connection.query(
    `CREATE TABLE IF NOT EXISTS files (
      id BINARY(16) DEFAULT (UUID_TO_BIN(UUID())) NOT NULL PRIMARY KEY,
      filename VARCHAR(100) NOT NULL,
      date TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      data JSON NOT NULL)`
  );

  await connection.query(
    `CREATE TABLE IF NOT EXISTS assignments (
      id VARCHAR(40) NOT NULL PRIMARY KEY,
      fileid BINARY(16) NOT NULL,
      scribe BOOLEAN DEFAULT TRUE,
      FOREIGN KEY (fileid) REFERENCES files(id))`
  );
}

/** Author supplied information about configuration. */
type Info = {
  name: string;
  version: string;
  author: string;
  copyright: string;
  saved: string;
  filename: string;
};
/** Configuration file meta-data. */
type FileInfo = {
  id: string;
  filename: string;
  date: string;
  info: Info;
  uses: number;
};
/**
 * Retrieve the list of configuration files and their meta-data
 */
async function getFiles(): Promise<FileInfo[]> {
  const [rows] = await pool.query(
    `SELECT
        BIN_TO_UUID(files.id) AS id,
        filename,
        date,
        JSON_EXTRACT(data, '$.info') AS info,
        count(assignments.id) AS uses
       FROM files
       LEFT JOIN assignments ON fileid = files.id
       GROUP BY id, filename, date, info
       ORDER BY date DESC`
  );
  return rows as FileInfo[];
}

/** Expected configuration file query shape. */
interface IFileData extends RowDataPacket {
  data: ConfigurationFile;
}
/**
 * Retrieve the configuration file with the given id.
 * @param {string} fileId uuid of the configuration file to retrieve.
 */
async function getFile(fileId: string): Promise<ConfigurationFile> {
  const [rows] = await pool.query<IFileData[]>(
    'SELECT data FROM files WHERE id=UUID_TO_BIN(?)',
    [fileId]
  );
  if (rows.length <= 0) {
    throw new Error('File data not found');
  }
  return rows[0].data;
}

/** Expected file id query shape. */
interface IFileId extends RowDataPacket {
  fileid: string;
}
/**
 * Retrieve the configuration file id for the given assignment.
 * @param assignmentId identifier of the assignment (from LTI host).
 */
async function getFileIdForAssignment(
  assignmentId: string
): Promise<{ fileid: string } | undefined> {
  const [rows] = await pool.query<IFileId[]>(
    'SELECT BIN_TO_UUID(fileid) AS fileid FROM assignments WHERE id=?',
    [assignmentId]
  );
  return rows.at(0);
}

/**
 * Retrieve configuration file for the given assignment.
 * @param assignmentId assignment identifier from LTI host.
 */
async function getFileForAssignment(
  assignmentId: string
): Promise<ConfigurationFile> {
  const [rows] = await pool.query<IFileData[]>(
    'SELECT data FROM files LEFT JOIN assignments ON fileid = files.id WHERE assignments.id = ?',
    [assignmentId]
  );
  if (rows.length <= 0) {
    throw new Error('File data not found for assignment');
  }
  return rows[0].data;
}
/**
 * Insert configuration file.
 * @param filename name of file
 * @param date uploaded date
 * @param config strigified JSON
 */
async function storeFile(filename: string, date: string, config: string) {
  await pool.query('INSERT INTO files (filename, data) VALUES(?, ?)', [
    filename,
    config,
  ]);
  return { filename, date };
}

/** Expected prompt query response shape. */
interface PromptQuery extends RowDataPacket {
  genre: string;
  overview: string;
  service: Prompt;
}
type PromptData = Prompt & { genre: string; overview: string };
const defaultPrompt: PromptData = {
  genre: '',
  overview: '',
  prompt: '',
  role: 'You are a chatbot',
  temperature: 0.0,
};

/**
 * Retrieve the OpenAI prompt template for the given tool and assignment.
 * @param assignment provided by host
 * @param tool identifier for the OpenAI enhanced tool.
 */
async function getPrompt(
  assignment: string,
  tool:
    | 'notes_to_prose'
    | 'copyedit'
    | 'grammar'
    | 'expectation'
    | 'logical_flow'
    | 'topics'
): Promise<PromptData> {
  if (
    ![
      'notes_to_prose',
      'copyedit',
      'grammar',
      'expectation',
      'logical_flow',
      'topics',
    ].includes(tool)
  ) {
    console.error('Not a valid scribe tool!');
    return defaultPrompt;
  }
  if (!assignment) {
    throw new Error('No assignment for rule data fetch.');
  }
  const [rows] = await pool.query<PromptQuery[]>(
    `SELECT
     JSON_EXTRACT(data, '$.rules.name') AS genre,
     JSON_EXTRACT(data, '$.rules.overview') AS overview,
     JSON_EXTRACT(data, '$.prompt_templates.${tool}') AS service
     FROM files LEFT JOIN assignments ON fileid = files.id
     WHERE assignments.id = ?`,
    [assignment]
  );
  if (rows.length <= 0) {
    throw new Error('File lookup error!');
  }
  const { genre, overview, service } = rows[0];
  return { ...defaultPrompt, ...service, genre, overview };
}

const metrics = new PrometheusMetrics();
let onTopicRequests = 0;
let onTopicRequestsAvg = 0;
let onTopicResponseAvg = 0;
let onTopicResponseAvgCount = 0;

metrics.setMetricObject(
  'eberly_dswa_requests_total',
  onTopicRequests,
  'counter',
  'Number of requests made to the OnTopic backend'
);
metrics.setMetricObject(
  'eberly_dswa_requests_avg',
  onTopicRequestsAvg,
  'counter',
  'Average number of requests made to the OnTopic backend'
);
metrics.setMetricObject(
  'eberly_dswa_uptime_total',
  process.uptime(),
  'counter',
  'DSWA Server uptime'
);
metrics.setMetricObject(
  'eberly_dswa_response_avg',
  onTopicResponseAvg,
  'counter',
  'DSWA OnTopic average response time'
);

/**
 * Reset the average counters every 5 minutes. That way the code can just keep adding and re-calculating without having
 * to worry about moving averages and queu sizes. We should probably change this in the near future to be more
 * representative
 */
function updateMetricsAvg() {
  onTopicRequestsAvg = 0;
  onTopicResponseAvg = 0;
  onTopicResponseAvgCount = 0;

  metrics.setMetricObject(
    'eberly_dswa_requests_total',
    onTopicRequests,
    'counter',
    'Number of requests made to the OnTopic backend'
  );
  metrics.setMetricObject(
    'eberly_dswa_requests_avg',
    onTopicRequestsAvg,
    'counter',
    'Average number of requests made to the OnTopic backend'
  );
  metrics.setMetricObject(
    'eberly_dswa_response_avg',
    0,
    'counter',
    'DSWA OnTopic average response time'
  );
}
/**
 *
 */
function updateUptime() {
  metrics.setMetricObject(
    'eberly_dswa_uptime_total',
    process.uptime(),
    'counter',
    'DSWA Server uptime'
  );
}

/**
 *
 */
function updateMetrics() {
  onTopicRequests++;
  onTopicRequestsAvg++;

  metrics.setMetricObject(
    'eberly_dswa_requests_total',
    onTopicRequests,
    'counter',
    'Number of requests made to the OnTopic backend'
  );
  metrics.setMetricObject(
    'eberly_dswa_requests_avg',
    onTopicRequestsAvg,
    'counter',
    'Average number of requests made to the OnTopic backend'
  );
}

/**
 *
 */
function updateResponseAvg(aValue: number) {
  onTopicResponseAvg += aValue;
  onTopicResponseAvgCount++;

  const average = onTopicResponseAvg / onTopicResponseAvgCount;
  metrics.setMetricObject(
    'eberly_dswa_response_avg',
    average,
    'counter',
    'DSWA OnTopic average response time'
  );
}

const PUBLIC = '../../build/app';
const STATIC = '/static';

let DEFAULT_RULES: ConfigurationFile | undefined = undefined;
/**
 *
 */
async function getDefaultRuleData(): Promise<ConfigurationFile | undefined> {
  if (!DEFAULT_RULES) {
    try {
      const filename = join(__dirname, STATIC, 'dswa.json');
      const file = await open(filename);
      const ruleFile = await file.readFile({ encoding: 'utf8' });
      await file.close();
      DEFAULT_RULES = JSON.parse(ruleFile);
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
    }
  }
  return DEFAULT_RULES;
}

function startup() {
  // Reset the avg values every 5 minutes
  setInterval(updateMetricsAvg, 5 * 60 * 1000); // Every 5 minutes
  setInterval(updateUptime, 1000); // Every second
}

const app = express();
app.set('etag', 'strong');
app.use(express.json());
app.use(cors({ origin: '*' }));
app.use(fileUpload({ createParentPath: true }));
app.use(
  express.urlencoded({
    extended: true,
  })
);

/////////// Configuration Endpoints //////////////
app.get(
  '/api/v1/configurations/:fileId',
  async (request: Request, response: Response) => {
    const fileId = request.params.fileId;
    try {
      const data = await getFile(fileId);
      if (data) {
        response.send(data);
      } else {
        response.sendStatus(404);
      }
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      response.sendStatus(500);
    }
  }
);

app
  .route('/api/v1/configurations')
  .post(async (request: Request, response: Response) => {
    // TODO limit to instructor/administrative roles.
    if (!request.files) {
      response.status(400).send({
        status: false,
        message: 'No file uploaded',
      });
    } else {
      console.log('Processing file upload...');
      // TODO check verse schema

      try {
        const jsonFile = request.files.file;
        if (!(jsonFile instanceof Array)) {
          const jsonObject = jsonFile.data.toString();

          console.log(`Storing: ${jsonFile.name} (${request.body.date})...`);
          const filedata = await storeFile(
            jsonFile.name,
            request.body.date,
            jsonObject
          );
          response.json(filedata);
        } else {
          console.error(
            'Multiple files uploaded, this only supports single file uploads.'
          );
          response.sendStatus(400);
        }
      } catch (err) {
        console.error(err instanceof Error ? err.message : err);
        if (err instanceof SyntaxError) {
          // likely bad json
          response.status(400).send(err.message);
        } else {
          // likely bad db call
          response.sendStatus(500);
        }
      }
    }
  })
  .get(async (_request: Request, response: Response) => {
    // TODO: check if accessable by LTI authentication/role
    try {
      const files = await getFiles();
      response.json(files);
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      response.sendStatus(500);
    }
  });

app.post(
  '/api/v1/assignments/:assignment/assign',
  (request: Request, response: Response) => {
    // TODO add role check to see if LTI user is authorized to change
    // TODO get assignment from LTI parameters instead of reflected from interface
    const { assignment } = request.params;
    const { id } = request.body; // as {id: string}
    console.log(`Assigning ${id} to assignment: ${assignment}`);
    try {
      pool.query(
        `INSERT INTO assignments (id, fileid)
       VALUES (?, UUID_TO_BIN(?))
       ON DUPLICATE KEY UPDATE fileid=UUID_TO_BIN(?)`,
        [assignment, id, id]
      );
      response.sendStatus(201);
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      response.sendStatus(500);
    }
  }
);

app.get(
  '/api/v1/assignments/:assignment/file_id',
  async (request: Request, response: Response) => {
    const { assignment } = request.params;
    try {
      const data = await getFileIdForAssignment(assignment);
      if (data) {
        response.json(data);
      } else {
        response.sendStatus(404);
      }
    } catch (err) {
      console.error(err);
      response.sendStatus(500);
    }
  }
);

////////// Metrics Endpoint /////////////
startup();
app.get('/metrics', async (_request: Request, response: Response) => {
  const metricsString = await metrics.build();
  response.contentType('text/text');
  response.send(metricsString);
});

/////////// Scribe Endpoints /////////////
app.post(
  '/api/v1/scribe/convert_notes',
  async (request: Request, response: Response) => {
    // TODO get assignment id from LTI token
    const { assignment, notes } = request.body;
    const { genre, overview, prompt, role, temperature } = await getPrompt(
      assignment,
      'notes_to_prose'
    );
    if (!genre || !prompt || !role) {
      // runtime safety - should never happen
      console.warn('Malformed notes prompt data.');
      response.json({});
      return;
    }
    const content = format(prompt, { genre, notes, overview });
    try {
      const prose = await openai.chat.completions.create({
        temperature: isNaN(Number(temperature)) ? 0.0 : Number(temperature),
        messages: [
          { role: 'system', content: role },
          {
            role: 'user',
            content,
          },
        ],
        model: 'gpt-4',
      });
      // TODO check for empty prose
      response.json(prose);
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      response.sendStatus(500);
    }
  }
);

type TextPrompt = 'copyedit' | 'grammar' | 'logical_flow' | 'topics';
const scribeText =
  (key: TextPrompt) => async (request: Request, response: Response) => {
    // TODO get assignment id from token
    const { assignment, text } = request.body;
    const { prompt, role, temperature } = await getPrompt(assignment, key);
    if (!prompt) {
      console.error(`No valid prompt for ${key} in ${assignment}`);
      response.sendStatus(404);
      return;
    }
    const content = format(prompt, { text });
    try {
      const chat = await openai.chat.completions.create({
        temperature: isNaN(Number(temperature)) ? 0.0 : Number(temperature),
        messages: [
          { role: 'system', content: role ?? 'You are a chatbot' },
          {
            role: 'user',
            content,
          },
        ],
        model: 'gpt-4',
      });
      response.json(chat);
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      response.sendStatus(500);
    }
  };
app.post('/api/v1/scribe/proofread', scribeText('grammar'));
app.post('/api/v1/scribe/copyedit', scribeText('copyedit'));

interface ExpectationPrompt extends RowDataPacket {
  service: Prompt;
  prompt: string;
}
app.post(
  '/api/v1/scribe/assess_expectation',
  async (request: Request, response: Response) => {
    const { assignment, text, expectation } = request.body;
    if (!assignment) {
      console.error('No assignment for rule data fetch.');
      response.sendStatus(400);
      return;
    }
    const [rows] = await pool.query<ExpectationPrompt[]>(
      `SELECT 
     data->'$.prompt_templates.expectation' AS service,
     JSON_EXTRACT(data, REPLACE(JSON_UNQUOTE(JSON_SEARCH(data, 'one',  ?)), "name", "prompt")) AS prompt
     FROM files LEFT JOIN assignments ON fileid = files.id
     WHERE assignments.id = ?`,
      [expectation, assignment]
    );
    if (rows.length <= 0) {
      console.error(`File lookup error for ${assignment}!`);
      response.sendStatus(404);
      return;
    }
    const { service, prompt } = rows[0];
    if (!prompt) {
      console.warn('Malformed expectation prompt.', prompt);
      console.error(
        'Configuration file does not support expectation analysis.'
      );
      response.sendStatus(502);
      return;
    }
    const content = format(prompt, { text });
    try {
      const assessment = await openai.chat.completions.create({
        temperature: isNaN(Number(service.temperature))
          ? 0.0
          : Number(service.temperature),
        messages: [
          {
            role: 'system',
            content: service.role ?? 'You are a writing analyst.',
          },
          { role: 'user', content },
        ],
        model: 'gpt-4',
      });
      response.json(assessment);
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      response.sendStatus(500);
    }
  }
);
app.post('/api/v1/scribe/logical_flow', scribeText('logical_flow'));
app.post('/api/v1/scribe/topics', scribeText('topics'));

///// Assignment Endpoints /////
const getAssignmentConfig = async (response: Response, assignment: string) => {
  if (assignment.trim().toLowerCase() !== 'global') {
    try {
      const rules = await getFileForAssignment(assignment);
      response.json(rules);
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      response.sendStatus(404);
    }
  } else {
    console.warn(`Invalid assignment id (${assignment}), sending default.`);
    const rules = await getDefaultRuleData();
    response.json(rules);
  }
};
app.get(
  '/api/v1/assignments/:assignment/configuration',
  async (request: Request, response: Response) => {
    // not currently used, but will be useful for deep-linking.
    const { assignment } = request.params;
    await getAssignmentConfig(response, assignment);
  }
);
app.get('/api/v1/rules', async (request: Request, response: Response) => {
  // TODO get assignment from LTI token
  const { course_id } = request.query;
  if (typeof course_id === 'string')
    await getAssignmentConfig(response, course_id);
  else {
    response.sendStatus(400);
  }
});

//// OnTopic Enpoint ////
app.post('/api/v1/ontopic', async (request: Request, response: Response) => {
  updateMetrics();
  const url = new URL(
    'ontopic',
    `http://${ONTOPIC_HOST}:${ONTOPIC_PORT}/api/v1/`
  );

  const startDate = Date.now();

  try {
    const res = await fetch(url.toString(), {
      method: 'POST',
      body: JSON.stringify(request.body),
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) {
      throw new Error(
        `Bad response from ontopic: ${res.status} - ${res.statusText}`
      );
    }
    const ret = await res.json();
    updateResponseAvg(Date.now() - startDate);

    response.json({
      status: 'success',
      data: ret,
    });
  } catch (err) {
    console.error(err);
    response.sendStatus(500);
  }
});

app.all('/api/v1/*', (_request: Request, response: Response) => {
  response.sendStatus(404);
});

/**
 *
 */
const useLTI = true;

/**
 * https://expressjs.com/en/api.html#req
 */
// debugRequest(request) {
//   console.log("req.baseUrl: " + request.baseUrl);
//   console.log("req.path: " + request.path);
//   console.log("oauth_consumer_key:" + request.body.oauth_consumer_key);
// }

/**
 * http://www.passportjs.org/packages/passport-oauth2/
 */
function verifyLTI(request: Request) {
  //console.log("verifyLTI (" + request.body.oauth_consumer_key + ")");
  return request.body.oauth_consumer_key !== '';
}

/**
 *
 * @param {Request} request
 */
function generateSettingsObject(request: Request) {
  const token = generateAccessToken('dummy');
  return {
    lti: { ...request.body, token },
  };
}

/**
 *
 * @param {Request} request
 * @param {Response} response
 */
function processRequest(request: Request, response: Response) {
  if (useLTI === true) {
    if (['/', '/index.html', '/index.htm'].includes(request.path)) {
      if (verifyLTI(request) === true) {
        const settingsObject = generateSettingsObject(request);
        const stringed = JSON.stringify(settingsObject);
        const raw = readFileSync(join(__dirname, PUBLIC, 'index.html'), 'utf8');
        const html = raw.replace(
          '/*SETTINGS*/',
          `var serverContext=${stringed}; var applicationContext=${JSON.stringify(
            { version }
          )};`
        );

        //response.render('main', { html: html });
        response.send(html);
      } else {
        response.sendFile(join(__dirname, STATIC, 'nolti.html'));
      }

      return;
    }
  }

  // Strip possible LTI path from file path. We shouldn't need this unless this LTI needs to
  // exist on the server with other add-ons. Instead we should just configure the url to
  // point to the root of the host

  let path = request.path;

  //>------------------------------------------------------------------

  if (request.path.indexOf('/lti/activity/docuscope') !== -1) {
    console.log("We've got an LTI path, stripping ...");
    path = request.path.replace('/lti/activity/docuscope', '/');
  }

  //>------------------------------------------------------------------

  if (path === '/') {
    path = '/index.html';
  }

  //>------------------------------------------------------------------

  response.sendFile(join(__dirname, PUBLIC, path));
}

app.get('/*', (request: Request, response: Response) => {
  processRequest(request, response);
});

app.post('/*', (request: Request, response: Response) => {
  processRequest(request, response);
});

initializeDatabase().then(() => {
  console.log('Database service initialized, ok to start listening ...');
  app.listen(port, () => {
    console.log(`App running on port ${port}.`);
  });
});
