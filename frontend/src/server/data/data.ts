import { PoolConnection, RowDataPacket, createPool } from 'mysql2/promise';
import { MYSQL_POOL } from '../settings';
import { ConfigurationData, Prompt } from '../../lib/Configuration';

const pool = createPool(MYSQL_POOL);

/**
 * Wait for connection to database and ensure that the expected
 * tables exist.
 */
export async function initializeDatabase() {
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
export async function findAllFiles(): Promise<FileInfo[]> {
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
  data: ConfigurationData;
}
/**
 * Retrieve the configuration file with the given id.
 * @param {string} fileId uuid of the configuration file to retrieve.
 */
export async function findFileById(fileId: string): Promise<ConfigurationData> {
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
export async function findFileIdByAssignment(
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
export async function findFileByAssignment(
  assignmentId: string
): Promise<ConfigurationData> {
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
export async function storeFile(
  filename: string,
  date: string,
  config: string
) {
  await pool.query('INSERT INTO files (filename, data) VALUES(?, ?)', [
    filename,
    config,
  ]);
  return { filename, date };
}

/**
 * Sets or updates an assignments configutation file association.
 * @param assignment id of the assignment.
 * @param id id of the configuration file.
 * @returns
 */
export async function updateAssignment(assignment: string, id: string) {
  return pool.query(
    `INSERT INTO assignments (id, fileid)
   VALUES (?, UUID_TO_BIN(?))
   ON DUPLICATE KEY UPDATE fileid=UUID_TO_BIN(?)`,
    [assignment, id, id]
  );
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
export async function findPromptByAssignmentAndTool(
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

interface ExpectationPrompt extends RowDataPacket {
  service: Prompt;
  prompt: string;
}

export async function findPromptByAssignmentExpectation(
  assignment: string,
  expectation: string
) {
  const [rows] = await pool.query<ExpectationPrompt[]>(
    `SELECT 
   data->'$.prompt_templates.expectation' AS service,
   JSON_EXTRACT(data, REPLACE(JSON_UNQUOTE(JSON_SEARCH(data, 'one',  ?)), "name", "prompt")) AS prompt
   FROM files LEFT JOIN assignments ON fileid = files.id
   WHERE assignments.id = ?`,
    [expectation, assignment]
  );
  if (rows.length <= 0) {
    throw new ReferenceError(`File lookup error for ${assignment}!`);
  }
  const { service, prompt } = rows[0];
  return { service, prompt };
}
