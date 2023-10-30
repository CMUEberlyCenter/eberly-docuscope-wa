/**
 Via:
  https://blog.logrocket.com/nodejs-expressjs-postgresql-crud-rest-api-example/
  https://node-postgres.com/features/pooling
  https://expressjs.com/en/guide/routing.html
  https://stackabuse.com/get-http-post-body-in-express-js/
  https://github.com/js-kyle/nodejs-lti-provider/blob/master/lti/index.js
  https://github.com/Cvmcosta/ltijs
*/
import { Command, Option } from "commander";
import cors from "cors";
import "dotenv/config";
import express from "express";
import fileUpload from "express-fileupload";
import { readFileSync } from "fs";
import jwt from "jsonwebtoken";
import { createPool } from "mysql2/promise";
import { open } from "node:fs/promises";
import process from "node:process";
import { OpenAI } from "openai";
import path from "path";
import format from "string-format";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";
import info from "./package.json" assert { type: "json" };
import PrometheusMetrics from "./prometheus.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const program = new Command();
program
  .description("Backend server for DocuScope Write and Audit.")
  .addOption(
    new Option("-p --port <number>", "Port to use for server.").env("PORT")
  )
  .addOption(
    new Option("--db <string>", "Database")
      .env("MYSQL_DATABASE")
      .default("dswa")
  );
// .addOption(new Option("--on-topic <uri>", "OnTopic server").env("DSWA_ONTOPIC_HOST")
program.parse();
const options = program.opts();
const port = !isNaN(parseInt(options.port)) ? parseInt(options.port) : 8888;
const MYSQL_DB = options.db ?? "dswa";

/**
 * Retrieves value from environment variables.
 * Checks for <base>_FILE first to support docker secrets.
 * @param {string} base
 * @param {*} defaultValue
 * @returns
 */
function fromEnvFile(base, defaultValue) {
  if (process.env[`${base}_FILE`]) {
    return readFileSync(process.env[`${base}_FILE`], "utf-8").trim();
  }
  if (process.env[base]) {
    return process.env[base];
  }
  return defaultValue;
}

const MYSQL_USER = fromEnvFile("MYSQL_USER");
const MYSQL_PASSWORD = fromEnvFile("MYSQL_PASSWORD");

const ONTOPIC_HOST = process.env.DSWA_ONTOPIC_HOST ?? "localhost";
const ONTOPIC_PORT = isNaN(process.env.DSWA_ONTOPIC_PORT)
  ? 5000
  : parseInt(process.env.DSWA_ONTOPIC_PORT);

const TOKEN_SECRET = fromEnvFile("TOKEN_SECRET", "");

const openai = new OpenAI({ apiKey: fromEnvFile("OPENAI_API_KEY") });

const VERSION = info.version;

let onTopicRequests = 0;
let onTopicRequestsAvg = 0;
let onTopicResponseAvg = 0;
let onTopicResponseAvgCount = 0;

const pool = createPool({
  host: process.env.DB_HOST,
  user: MYSQL_USER,
  port: process.env.DB_PORT ?? 3306,
  password: MYSQL_PASSWORD,
  database: MYSQL_DB,
  waitForConnections: true,
  connectionLimit: 100,
  timezone: "Z", // Makes TIMESTAMP work correctly
});

async function initializeDatabase() {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS files (
      id BINARY(16) DEFAULT (UUID_TO_BIN(UUID())) NOT NULL PRIMARY KEY,
      filename VARCHAR(100) NOT NULL,
      date TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      data JSON NOT NULL)`
  );

  await pool.query(
    `CREATE TABLE IF NOT EXISTS assignments (
      id VARCHAR(40) NOT NULL PRIMARY KEY,
      fileid BINARY(16) NOT NULL,
      scribe BOOLEAN DEFAULT TRUE,
      FOREIGN KEY (fileid) REFERENCES files(id))`
  );
}

/**
 * Retrieve the list of configuration files and their meta-data
 * @returns {Promise<{id: string, filename: string, date: string, info: {name: string, version: string, author: string, copyright: string, saved: string, filename: string}, uses: number}[]>}
 */
async function getFiles() {
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
  return rows;
}

/**
 *
 * @param {string} fileId uuid of the configuration file to retrieve.
 * @returns {Promise<{data: unknown, filename: string}|undefined>}
 */
async function getFile(fileId) {
  const [rows] = await pool.query(
    "SELECT data, filename FROM files WHERE id=UUID_TO_BIN(?)",
    [fileId]
  );
  return rows ? rows[0].data : undefined;
}

/**
 *
 * @param {string} assignmentId
 * @returns {Promise<{fileid: string}>}
 */
async function getFileIdForAssignment(assignmentId) {
  const [rows] = await pool.query(
    "SELECT BIN_TO_UUID(fileid) AS fileid FROM assignments WHERE id=?",
    [assignmentId]
  );
  return rows.at(0);
}

/**
 *
 * @param {string} assignmentId
 * @returns {*} JSON contents of configuration file.
 */
async function getFileForAssignment(assignmentId) {
  const [rows] = await pool.query(
    "SELECT data FROM files LEFT JOIN assignments ON fileid = files.id WHERE assignments.id = ?",
    [assignmentId]
  );
  if (rows.length <= 0) {
    throw new Error("File data not found for assignment");
  }
  return rows[0].data;
}
/**
 *
 * @param {string} filename
 * @param {string} aDate
 * @param {*} aJSONObject
 */
async function storeFile(filename, date, aJSONObject) {
  await pool.query(
    "INSERT INTO files (filename, data) VALUES(?, ?)",
    [filename, JSON.stringify(aJSONObject)]
  );
  return { filename, date };
}

const metrics = new PrometheusMetrics();
metrics.setMetricObject(
  "eberly_dswa_requests_total",
  onTopicRequests,
  metrics.METRIC_TYPE_COUNTER,
  "Number of requests made to the OnTopic backend"
);
metrics.setMetricObject(
  "eberly_dswa_requests_avg",
  onTopicRequestsAvg,
  metrics.METRIC_TYPE_COUNTER,
  "Average number of requests made to the OnTopic backend"
);
metrics.setMetricObject(
  "eberly_dswa_uptime_total",
  process.uptime(),
  metrics.METRIC_TYPE_COUNTER,
  "DSWA Server uptime"
);
metrics.setMetricObject(
  "eberly_dswa_response_avg",
  onTopicResponseAvg,
  metrics.METRIC_TYPE_COUNTER,
  "DSWA OnTopic average response time"
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
    "eberly_dswa_requests_total",
    onTopicRequests,
    metrics.METRIC_TYPE_COUNTER,
    "Number of requests made to the OnTopic backend"
  );
  metrics.setMetricObject(
    "eberly_dswa_requests_avg",
    onTopicRequestsAvg,
    metrics.METRIC_TYPE_COUNTER,
    "Average number of requests made to the OnTopic backend"
  );
  metrics.setMetricObject(
    "eberly_dswa_response_avg",
    0,
    metrics.METRIC_TYPE_COUNTER,
    "DSWA OnTopic average response time"
  );
}
/**
 *
 */
function updateUptime() {
  metrics.setMetricObject(
    "eberly_dswa_uptime_total",
    process.uptime(),
    metrics.METRIC_TYPE_COUNTER,
    "DSWA Server uptime"
  );
}

/**
 *
 */
function updateMetrics() {
  onTopicRequests++;
  onTopicRequestsAvg++;

  metrics.setMetricObject(
    "eberly_dswa_requests_total",
    onTopicRequests,
    metrics.METRIC_TYPE_COUNTER,
    "Number of requests made to the OnTopic backend"
  );
  metrics.setMetricObject(
    "eberly_dswa_requests_avg",
    onTopicRequestsAvg,
    metrics.METRIC_TYPE_COUNTER,
    "Average number of requests made to the OnTopic backend"
  );
}

/**
 *
 */
function updateResponseAvg(aValue) {
  onTopicResponseAvg += aValue;
  onTopicResponseAvgCount++;

  const average = onTopicResponseAvg / onTopicResponseAvgCount;
  metrics.setMetricObject(
    "eberly_dswa_response_avg",
    average,
    metrics.METRIC_TYPE_COUNTER,
    "DSWA OnTopic average response time"
  );
}


/**
 *
 */
class DocuScopeWALTIService {
  /**
   *
   */
  constructor() {

    // Reset the avg values every 5 minutes
    setInterval(updateMetricsAvg, 5 * 60 * 1000); // Every 5 minutes
    setInterval(updateUptime, 1000); // Every second

    console.log(`DocuScope-WA front-end proxy version: ${VERSION}`);

    console.log(
      `Configured the OnTopic backend url to be: ${ONTOPIC_HOST}:${ONTOPIC_PORT}`
    );

    this.token = uuidv4();
    this.session = uuidv4();

    this.useLTI = true;
    this.publicHome = "/dist";
    this.staticHome = "/static";

    this.defaultRules = null; // default rules file cache

    // access config var
    this.mode = process.env.MODE ?? "production";

    this.app = express();

    this.app.set("etag", "strong");
    this.app.use(express.json());
    this.app.use(cors({ origin: "*" }));
    this.app.use(fileUpload({ createParentPath: true }));

    this.app.use(
      express.urlencoded({
        extended: true,
      })
    );
  }

  /**
   *
   * @returns {Promise<any>}
   */
  async getDefaultRuleData() {
    if (!this.defaultRules) {
      try {
        const filename = path.join(__dirname, this.staticHome, "dswa.json");
        const file = await open(filename);
        const ruleFile = await file.readFile({ encoding: "utf8" });
        await file.close();
        this.defaultRules = JSON.parse(ruleFile);
      } catch (err) {
        console.log(err.message);
      }
    }
    return this.defaultRules ?? {};
  }

  /**
   *
   * @param {Request} _request
   * @param {Response} response
   */
  async sendDefaultFile(_request, response) {
    try {
      const ruleData = await this.getDefaultRuleData();
      response.json(this.generateDataMessage(ruleData));
    } catch (err) {
      console.error(err.message);
      response.sendStatus(404);
    }
  }

  /**
   *
   */
  pad(s) {
    return (s < 10 ? "0" : "") + s;
  }

  /**
   *
   */
  format(seconds) {
    var hours = Math.floor(seconds / (60 * 60));
    var minutes = Math.floor((seconds % (60 * 60)) / 60);
    var second = Math.floor(seconds % 60);

    return this.pad(hours) + ":" + this.pad(minutes) + ":" + this.pad(second);
  }

  /**
   * Here’s an example of a function for signing tokens:
   */
  generateAccessToken(aString) {
    const tSecret =
      TOKEN_SECRET === "dummy" || TOKEN_SECRET === "" ? uuidv4() : TOKEN_SECRET;
    return jwt.sign({ payload: aString }, tSecret, { expiresIn: "1800s" });
  }

  /**
   * https://expressjs.com/en/api.html#req
   */
  // debugRequest(request) {
  //   console.log("req.baseUrl: " + request.baseUrl);
  //   console.log("req.path: " + request.path);
  //   console.log("oauth_consumer_key:" + request.body.oauth_consumer_key);
  // }

  /**
   *
   */
  generateDataMessage(aDataset) {
    return {
      status: "success",
      data: aDataset,
    };
  }

  /**
   * http://www.passportjs.org/packages/passport-oauth2/
   */
  verifyLTI(request) {
    console.log("verifyLTI (" + request.body.oauth_consumer_key + ")");
    return request.body.oauth_consumer_key !== "";
  }

  /**
   *
   * @param {Request} request
   */
  generateSettingsObject(request) {
    const token = this.generateAccessToken("dummy");
    return {
      lti: { ...request.body, token },
    };
  }

  /**
   *
   */
  createDataMessage(aData) {
    let message = {
      status: "request",
      data: aData,
    };
    return JSON.stringify(message);
  }

  /**
   *
   */
  processMetrics(_request, response) {
    const metricsString = metrics.build();

    response.contentType("text/text");
    response.send(metricsString);
  }

  /**
   *
   * @param {string} aURL
   * @param {*} data
   * @param {Response} response
   */
  async apiPOSTCall(aURL, data, response) {
    const url = new URL(aURL, `http://${ONTOPIC_HOST}:${ONTOPIC_PORT}/api/v1/`);
    console.log(`apiPOSTCall (${url})`);

    const startDate = Date.now();

    try {
      const res = await fetch(url.toString(), {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) {
        throw new Error(
          `Bad response from ontopic: ${res.status} - ${res.statusText}`
        );
      }
      const ret = await res.json();
      updateResponseAvg(Date.now() - startDate);

      response.json(this.generateDataMessage(ret));
    } catch (err) {
      console.error(err);
      response.sendStatus(500);
    }
  }

  /**
   *
   * @param {Request} request
   * @param {Response} response
   */
  processRequest(request, response) {
    //>------------------------------------------------------------------

    if (this.useLTI === true) {
      if (["/", "/index.html", "/index.htm"].includes(request.path)) {
        if (this.verifyLTI(request) === true) {
          const settingsObject = this.generateSettingsObject(request);

          const stringed = JSON.stringify(settingsObject);

          const raw = readFileSync(
            __dirname + this.publicHome + "/index.html",
            "utf8"
          );
          const html = raw.replace(
            "/*SETTINGS*/",
            `var serverContext=${stringed}; var applicationContext=${JSON.stringify(
              { version: VERSION }
            )};`
          );

          //response.render('main', { html: html });
          response.send(html);
        } else {
          response.sendFile(
            path.join(__dirname, this.staticHome, "nolti.html")
          );
        }

        return;
      }
    }

    // Strip possible LTI path from file path. We shouldn't need this unless this LTI needs to
    // exist on the server with other add-ons. Instead we should just configure the url to
    // point to the root of the host

    let path = request.path;

    //>------------------------------------------------------------------

    if (request.path.indexOf("/lti/activity/docuscope") != -1) {
      console.log("We've got an LTI path, stripping ...");
      path = request.path.replace("/lti/activity/docuscope", "/");
    }

    //>------------------------------------------------------------------

    if (path === "/") {
      path = "/index.html";
    }

    //>------------------------------------------------------------------

    response.sendFile(__dirname + this.publicHome + path);
  }

  /**
   *
   * @param {string} assignment
   * @param {'notes_to_prose'|'copyedit'|'proofread'|'expectation'} tool
   * @returns {Promise<{genre: string, prompt: string, role: string, temperature: number, overview: string}>}
   */
  async getPrompt(assignment, tool) {
    const defaultPrompt = {
      genre: "",
      overview: "",
      prompt: "",
      role: "You are a chatbot",
      temperature: 0.0,
    };
    if (
      !["notes_to_prose", "copyedit", "proofread", "expectation"].includes(tool)
    ) {
      console.error("Not a valid scribe tool!");
      return defaultPrompt;
    }
    try {
      if (!assignment) {
        throw new Error("No assignment for rule data fetch.");
      }
      const [rows] = await pool.query(
        `SELECT
         JSON_EXTRACT(data, '$.rules.name') AS genre,
         JSON_EXTRACT(data, '$.rules.overview') AS overview,
         JSON_EXTRACT(data, '$.prompt_templates.${tool}') AS service
         FROM files LEFT JOIN assignments ON fileid = files.id
         WHERE assignments.id = ?`,
        [assignment]
      );
      if (rows.length <= 0) {
        throw new Error("File lookup error!");
      }
      const { genre, overview, service } = rows.at(0);
      return { ...defaultPrompt, ...service, genre, overview };
    } catch (err) {
      console.error(err);
      console.warn("Using default data.");
      try {
        const data = await this.getDefaultRuleData();
        return {
          ...defaultPrompt,
          ...data.prompt_templates[prompt],
          genre: data.rules.name,
          overview: data.rules.overview,
        };
      } catch (err) {
        console.error(err.message);
        return defaultPrompt;
      }
    }
  }
  /**
   *
   */
  async run() {
    this.app.get("/api/v1/configurations/:fileId", async (request, response) => {
      const fileId = request.params.fileId;
      try {
        const data = await getFile(fileId);
        if (data) {
          response.send(data);
        } else {
          response.sendStatus(404);
        }
      } catch (err) {
        console.error(err.message);
        response.sendStatus(500);
      }
    });

    this.app.post("/api/v1/configurations", async (request, response) => {
      // TODO limit to instructor/administrative roles.
      if (!request.files) {
        response.status(400).send({
          status: false,
          message: "No file uploaded",
        });
      } else {
        console.log("Processing file upload ...");
        // TODO check verse schema

        try {
          const jsonFile = request.files.file;
          const jsonObject = JSON.parse(jsonFile.data);

          console.log(`Storing: ${jsonFile.name} ("${request.body.date}) ...`);
          const filedata = await storeFile(
            jsonFile.name,
            request.body.date,
            jsonObject
          );
          response.json(this.generateDataMessage(filedata));
        } catch (err) {
          console.error(err.message);
          if (err instanceof SyntaxError) {
            // likely bad json
            response.status(400).send(err.message);
          } else {
            // likely bad db call
            response.sendStatus(500);
          }
        }
      }
    });

    this.app.get("/api/v1/configurations", async (_request, response) => {
      // TODO: check if accessable by LTI authentication/role
      try {
        const files = await getFiles();
        response.json(files);
      } catch (err) {
        console.error(err.message);
        response.sendStatus(500);
      }
    });

    this.app.post("/api/v1/assignments/:assignment/assign", (request, response) => {
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
        console.error(err.message);
        response.sendStatus(500);
      }
    });

    this.app.get("/api/v1/assignments/:assignment/file_id", async (request, response) => {
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
    });

    this.app.get("/metrics", (request, response) => {
      this.processMetrics(request, response);
    });

    this.app.post("/api/v1/scribe/convert_notes", async (request, response) => {
      // TODO get assignment id from LTI token
      const { course_id, notes } = request.body;
      const { genre, overview, prompt, role, temperature } =
        await this.getPrompt(course_id, "notes_to_prose");
      if (!genre || !prompt) {
        response.json({});
        return;
      }
      const content = format(prompt, { genre, notes, overview });
      const params = {
        temperature: isNaN(temperature) ? 0.0 : Number(temperature),
        messages: [
          { role: "system", content: role },
          {
            role: "user",
            content,
          },
        ],
        model: "gpt-4",
      };
      try {
        const prose = await openai.chat.completions.create(params);
        // TODO check for empty prose
        response.json(prose);
      } catch (err) {
        console.error(err.message);
        console.log(params);
        response.sendStatus(500);
      }
    });
    this.app.post("/api/v1/scribe/proofread", async (request, response) => {
      // TODO get assignment id from token/
      const { course_id, text } = request.body;
      const { prompt, role, temperature } = await this.getPrompt(
        course_id,
        "proofread"
      );
      if (!prompt) {
        response.json({}); // TODO send error.
        return;
      }
      const content = format(prompt, { text });
      const fixed = await openai.chat.completions.create({
        temperature: isNaN(temperature) ? 0.0 : Number(temperature),
        messages: [
          { role: "system", content: role },
          {
            role: "user",
            content,
          },
        ],
        model: "gpt-4",
      });
      response.json(fixed);
    });
    this.app.post("/api/v1/scribe/copyedit", async (request, response) => {
      const { course_id, text } = request.body;
      const { prompt, role, temperature } = await this.getPrompt(
        course_id,
        "copyedit"
      );
      if (!prompt) {
        response.json({}); // TODO send error.
        return;
      }
      const content = format(prompt, { text });
      const clarified = await openai.chat.completions.create({
        temperature: isNaN(temperature) ? 0.0 : Number(temperature),
        messages: [
          { role: "system", content: role ?? "You are a chatbot" },
          {
            role: "user",
            content,
          },
        ],
        model: "gpt-4",
      });
      response.json(clarified);
    });

    const getAssignmentConfig = async (response, course_id) => {
      if (course_id && course_id.trim().toLowerCase() !== "global") {
        try {
          const rules = await getFileForAssignment(course_id);
          response.json(this.generateDataMessage(rules));
        } catch (err) {
          console.error(err.message);
          response.sendStatus(404);
        }
      } else {
        console.warn(`Invalid course id (${course_id}), sending default.`);
        const rules = await this.getDefaultRuleData();
        response.json(this.generateDataMessage(rules));
      }
    };
    this.app.get(
      "/api/v1/assignments/:assignment/rules",
      async (request, response) => {
        // not currently used, but will be useful for deep-linking.
        const { assignment } = request.params;
        await getAssignmentConfig(response, assignment);
      }
    );
    this.app.get("/api/v1/rules", async (request, response) => {
      // TODO get assignment from LTI token
      const { course_id } = request.query;
      await getAssignmentConfig(response, course_id);
    });

    /*
     Originally named 'ping', we had to change this because a bunch of browser-addons have a big
     problem with it. It trips up Adblock-Plus and Ghostery. So at least for now it's renamed
     to 'ding'
    */
    // Unsure of utility of this as results are not used.
    this.app.get("/api/v1/ding", (_request, response) => {
      response.json(
        this.generateDataMessage({
          uptime: this.format(process.uptime()),
          version: VERSION,
        })
      );
    });

    this.app.post("/api/v1/ontopic", (request, response) => {
      updateMetrics();
      this.apiPOSTCall("ontopic", request.body, response);
    });

    this.app.all("/api/v1/*", (_request, response) => {
      response.sendStatus(404);
    });

    this.app.get("/*", (request, response) => {
      this.processRequest(request, response);
    });

    this.app.post("/*", (request, response) => {
      this.processRequest(request, response);
    });

    await initializeDatabase();
    console.log("Database service initialized, ok to start listening ...");
    this.app.listen(port, () => {
      console.log(`App running on port ${port}.`);
    });
  }
}

const service = new DocuScopeWALTIService();
service.run();
