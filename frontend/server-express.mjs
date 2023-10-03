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
import { request } from "http";
import jwt from "jsonwebtoken";
import { createPool } from "mysql2";
import { open } from "node:fs/promises";
import process from "node:process";
import { OpenAI } from "openai";
import path from "path";
import format from "string-format";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from 'uuid';
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
    new Option("--db <string>", "Database").env("MYSQL_DATABASE").default("dswa")
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
    return readFileSync(process.env[`${base}_FILE`], 'utf-8');
  }
  if (process.env[base]) {
    return process.env[base];
  }
  return defaultValue;
}

const MYSQL_USER = fromEnvFile('MYSQL_USER');
const MYSQL_PASSWORD = fromEnvFile('MYSQL_PASSWORD');

const ONTOPIC_HOST = process.env.DSWA_ONTOPIC_HOST ?? "localhost";
const ONTOPIC_PORT = isNaN(process.env.DSWA_ONTOPIC_PORT)
  ? 5000
  : parseInt(process.env.DSWA_ONTOPIC_PORT);

const TOKEN_SECRET = fromEnvFile('TOKEN_SECRET', '');

const openai = new OpenAI({apiKey: fromEnvFile('OPEN_API_KEY')});

const VERSION = info.version;

var onTopicRequests = 0;
var onTopicRequestsAvg = 0;
var onTopicUptime = 0;
var onTopicResponseAvg = 0;
var onTopicResponseAvgCount = 0;

var onTopicDBRetry = 0;
var onTopicDBMaxRetry = 100;

var dbCallback = null;

/**
 *
 */
class DocuScopeWALTIService {
  /**
   *
   */
  constructor() {
    this.metrics = new PrometheusMetrics();
    this.metrics.setMetricObject(
      "eberly_dswa_requests_total",
      onTopicRequests,
      this.metrics.METRIC_TYPE_COUNTER,
      "Number of requests made to the OnTopic backend"
    );
    this.metrics.setMetricObject(
      "eberly_dswa_requests_avg",
      onTopicRequestsAvg,
      this.metrics.METRIC_TYPE_COUNTER,
      "Average number of requests made to the OnTopic backend"
    );
    this.metrics.setMetricObject(
      "eberly_dswa_uptime_total",
      onTopicUptime,
      this.metrics.METRIC_TYPE_COUNTER,
      "DSWA Server uptime"
    );
    this.metrics.setMetricObject(
      "eberly_dswa_response_avg",
      onTopicResponseAvg,
      this.metrics.METRIC_TYPE_COUNTER,
      "DSWA OnTopic average response time"
    );

    // Reset the avg values every 5 minutes
    setInterval(this.updateMetricsAvg, 5 * 60 * 1000); // Every 5 minutes
    setInterval(this.updateUptime, 1000); // Every second

    console.log(`DocuScope-WA front-end proxy version: ${VERSION}`);

    console.log(
      `Configured the OnTopic backend url to be: ${ONTOPIC_HOST}:${ONTOPIC_PORT}`
    );

    this.token = uuidv4();
    this.session = uuidv4();
    this.standardHeader = {
      method: "GET",
      cache: "no-cache",
    };

    this.useLTI = true;
    this.publicHome = "/public";
    this.staticHome = "/static";

    this.defaultRules = null; // default rules file cache

    // access config var
    this.mode = process.env.MODE ?? "production";

    this.app = express();

    // Turn off caching for now (detect developer mode!)
    this.app.set("etag", false);
    this.app.use(express.json());
    this.app.use(cors({ origin: "*" }));
    this.app.use(fileUpload({ createParentPath: true }));
    this.app.use((_req, res, next) => {
      res.set("Cache-Control", "no-store");
      next();
    });

    this.app.use(
      express.urlencoded({
        extended: true,
      })
    );

    this.processBackendReply = this.processBackendReply.bind(this);

    console.log("Server ready");
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
   */
  initDBService(cb) {
    console.log(
      "initDBService (retry:" +
        onTopicDBRetry +
        " of max " +
        onTopicDBMaxRetry +
        ")"
    );
    console.log(
      "Creating db connection: " +
        process.env.DB_HOST +
        ":" +
        process.env.DB_PORT
    );

    dbCallback = cb;

    // TODO retry until pool created.
    this.dbConn = createPool({
      connectionLimit: 100, //important
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      user: MYSQL_USER,
      password: MYSQL_PASSWORD,
      // database: MYSQL_DB,
      debug: false,
      timezone: "Z", // Makes TIMESTAMP work correctly
    });

    this.initDB();
  }

  /**
   *
   */
  initDB() {
    console.log(
      "initDB (retry:" + onTopicDBRetry + " of max " + onTopicDBMaxRetry + ")"
    );

    this.dbConn.getConnection((err, connection) => {
      if (err) {
        console.log(
          "Can't connect to database yet, entering retry ... ('" +
            err.message +
            "')"
        );
        onTopicDBRetry++;
        if (onTopicDBRetry > onTopicDBMaxRetry) {
          console.log("Reached max retry");
          throw err;
        }
        setTimeout(this.initDB, 10000);
        return;
      }

      console.log("Connected with thread id: " + connection.threadId);

      connection.query(
        `CREATE DATABASE IF NOT EXISTS ${MYSQL_DB}`,
        function (err, _result) {
          if (err) throw err;
          console.log("Database created");
        }
      );

      // Need to add a field here to identify the uploader/owner!

      connection.query(
        `CREATE TABLE IF NOT EXISTS ${MYSQL_DB}.files (
          id BINARY(16) DEFAULT (UUID_TO_BIN(UUID())) NOT NULL PRIMARY KEY,
          filename VARCHAR(100) NOT NULL,
          date TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          data JSON NOT NULL)`,
        function (err, _result) {
          if (err) throw err;
          console.log("DSWA file table created");
        }
      );

      connection.query(
        `CREATE TABLE IF NOT EXISTS ${MYSQL_DB}.assignments (
          id VARCHAR(40) NOT NULL PRIMARY KEY,
          fileid BINARY(16) NOT NULL,
          FOREIGN KEY (fileid) REFERENCES ${MYSQL_DB}.files(id))`,
        function (err, _result) {
          if (err) throw err;
          console.log("DSWA assignment table created");
        }
      );

      if (dbCallback) {
        dbCallback();
      } else {
        console.log("Error: no callback provided");
      }

      console.log("Database connection initialized");
    });
  }

  /**
   * Retrieve the list of configuration files and their meta-data
   */
  async getFiles() {
    const [rows] = await this.dbConn.promise().query(
      `SELECT
        BIN_TO_UUID(id) AS id,
        filename,
        date,
        JSON_EXTRACT(data, '$.info') AS info
       FROM ${MYSQL_DB}.files`
    );
    return rows;
  }

  async getFile(fileId) {
    const [rows] = await this.dbConn
      .promise()
      .query(
        `SELECT data, filename FROM ${MYSQL_DB}.files WHERE id=UUID_TO_BIN(?)`,
        [fileId]
      );
    return rows ? rows[0].data : undefined;
  }
  /**
   *
   * @param {string} course_id
   */
  async getFileForCourse(course_id) {
    const [rows] = await this.dbConn.promise().query(
      `SELECT data FROM ${MYSQL_DB}.files
         WHERE id=(SELECT fileid FROM ${MYSQL_DB}.assignments WHERE id=?)`,
      [course_id]
    );
    if (rows.length <= 0) {
      throw new Error("File data not found for assignment");
    }
    return rows[0].data;
  }

  /**
   *
   * @param {Request} request
   * @param {Response} response
   */
  async getFileIdFromCourse(request, response) {
    const { course_id } = request.query;
    if (!course_id) {
      console.warn("No course id in request.");
      response.sendStatus(404);
      return;
    }
    if (course_id === "global") {
      this.sendDefaultFile(request, response);
      return;
    }
    try {
      const [rows] = await this.dbConn
        .promise()
        .query(
          `SELECT BIN_TO_UUID(fileid) AS fileid FROM ${MYSQL_DB}.assignments WHERE id=?`,
          [course_id]
        );
      const data = rows.at(0);
      if (data) {
        response.json(this.generateDataMessage(data));
      } else {
        response.sendStatus(404);
      }
    } catch (err) {
      console.error(err);
      response.sendStatus(500);
    }
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
      // response.json(this.generateErrorMessage(err.message));
    }
  }

  /**
   *
   * @param {string} filename
   * @param {string} aDate
   * @param {*} aJSONObject
   */
  async storeFile(filename, date, aJSONObject) {
    await this.dbConn
      .promise()
      .query(`INSERT INTO ${MYSQL_DB}.files (filename, data) VALUES(?, ?)`, [
        filename,
        JSON.stringify(aJSONObject),
      ]);
    return { filename, date };
  }

  /**
   *
   * @param {Request} request
   * @param {Response} response
   */
  processCourseFileAssignment(request, response) {
    const { course_id, id } = request.query;
    console.log("Assigning " + id + " to course: " + course_id);
    try {
      this.dbConn.promise().query(
        `INSERT INTO ${MYSQL_DB}.assignments (id, fileid)
         VALUES (?, UUID_TO_BIN(?))
         ON DUPLICATE KEY UPDATE fileid=UUID_TO_BIN(?)`,
        [course_id, id, id]
      );
      response.sendStatus(201);
    } catch (err) {
      console.error(err.message);
      response.sendStatus(500);
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
    const tSecret = (TOKEN_SECRET === "dummy" || TOKEN_SECRET === "") ? uuidv4() : TOKEN_SECRET;
    return jwt.sign({ payload: aString }, tSecret, { expiresIn: "1800s" });
  }

  /**
   * https://expressjs.com/en/api.html#req
   */
  debugRequest(request) {
    console.log("req.baseUrl: " + request.baseUrl);
    console.log("req.path: " + request.path);
    console.log("oauth_consumer_key:" + request.body.oauth_consumer_key);
  }

  /**
   *
   */
  generateErrorMessage(aMessage) {
    var error = {
      status: "error",
      message: aMessage,
    };

    return error;
  }

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

    if (request.body.oauth_consumer_key == "") {
      return false;
    }

    return true;
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
    const metricsString = this.metrics.build();

    response.contentType("text/text");
    response.send(metricsString);
  }

  /**
   *
   */
  updateMetrics() {
    onTopicRequests++;
    onTopicRequestsAvg++;

    this.metrics.setMetricObject(
      "eberly_dswa_requests_total",
      onTopicRequests,
      this.metrics.METRIC_TYPE_COUNTER,
      "Number of requests made to the OnTopic backend"
    );
    this.metrics.setMetricObject(
      "eberly_dswa_requests_avg",
      onTopicRequestsAvg,
      this.metrics.METRIC_TYPE_COUNTER,
      "Average number of requests made to the OnTopic backend"
    );
  }

  /**
   * Reset the average counters every 5 minutes. That way the code can just keep adding and re-calculating without having
   * to worry about moving averages and queu sizes. We should probably change this in the near future to be more
   * representative
   */
  updateMetricsAvg() {
    onTopicRequestsAvg = 0;
    onTopicResponseAvg = 0;
    onTopicResponseAvgCount = 0;

    if (this.metrics) {
      this.metrics.setMetricObject(
        "eberly_dswa_requests_total",
        onTopicRequests,
        this.metrics.METRIC_TYPE_COUNTER,
        "Number of requests made to the OnTopic backend"
      );
      this.metrics.setMetricObject(
        "eberly_dswa_requests_avg",
        onTopicRequestsAvg,
        this.metrics.METRIC_TYPE_COUNTER,
        "Average number of requests made to the OnTopic backend"
      );
      this.metrics.setMetricObject(
        "eberly_dswa_response_avg",
        0,
        this.metrics.METRIC_TYPE_COUNTER,
        "DSWA OnTopic average response time"
      );
    }
  }

  /**
   *
   */
  updateUptime() {
    onTopicUptime += 1000;

    if (this.metrics) {
      this.metrics.setMetricObject(
        "eberly_dswa_uptime_total",
        onTopicUptime,
        this.metrics.METRIC_TYPE_COUNTER,
        "DSWA Server uptime"
      );
    }
  }

  /**
   *
   */
  updateResponseAvg(aValue) {
    onTopicResponseAvg += aValue;
    onTopicResponseAvgCount++;

    let average = onTopicResponseAvg / onTopicResponseAvgCount;
    this.metrics.setMetricObject(
      "eberly_dswa_response_avg",
      average,
      this.metrics.METRIC_TYPE_COUNTER,
      "DSWA OnTopic average response time"
    );
  }

  /**
   *
   */
  apiPOSTCall(aURL, aData, aResponse) {
    let url = "/api/v1/" + aURL;

    console.log("apiPOSTCall (" + url + ")");

    let startDate = new Date();

    const data = JSON.stringify(aData);

    const options = {
      hostname: ONTOPIC_HOST,
      path: url,
      port: ONTOPIC_PORT,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": data.length,
      },
    };

    const req = request(options, (res) => {
      if (res.statusCode === 200) {
        let body = "";

        res.on("data", (chunk) => {
          body += chunk;
        });

        res.on("end", () => {
          try {
            let json = JSON.parse(body);
            console.log(
              "Retrieved valid data from backend, forwarding to frontend ..."
            );
            console.log(json);

            let endDate = new Date();
            let millis = endDate.getTime() - startDate.getTime();

            this.updateResponseAvg(millis);

            //this.processBackendReply (json);

            aResponse.json(this.generateDataMessage(json));
          } catch (error) {
            console.error(error.message);
          }
        });
      } else {
        console.log("Server responded with " + res.statusCode);
      }
    });

    req.on("error", (error) => {
      console.error(error);
    });

    req.write(data);
    req.end();
  }

  /**
   *
   */
  processBackendReply(_json) {
    console.log("processBackendReply ()");
  }

  /**
   *
   * @param {Request} request
   * @param {Response} response
   */
  async processJSONDownload(request, response) {
    const fileId = request.query.id;
    console.log(`processJSONDownload (${fileId})`);
    try {
      const [result] = await this.dbConn
        .promise()
        .query(
          `SELECT data, filename FROM ${MYSQL_DB}.files WHERE id=UUID_TO_BIN(?)`,
          [fileId]
        );
      if (result) {
        response.send(result[0].data);
      } else {
        response.sendStatus(404);
      }
    } catch (err) {
      console.error(err.message);
      response.sendStatus(500);
    }
  }

  /**
   *
   * @param {Request} request
   * @param {Response} response
   */
  processRequest(request, response) {
    console.log("processRequest (" + request.path + ")");

    //>------------------------------------------------------------------

    if (request.path == "/upload") {
      console.log(
        "Info: we've already processed this, need a better way of handling this situation"
      );
      return;
    }

    //>------------------------------------------------------------------

    if (this.useLTI == true) {
      if (
        request.path == "/" ||
        request.path == "/index.html" ||
        request.path == "/index.htm"
      ) {
        if (this.verifyLTI(request) == true) {
          const settingsObject = this.generateSettingsObject(request);

          //response.sendFile(__dirname + this.publicHome + request.path);

          //console.log (settingsObject);

          const stringed = JSON.stringify(settingsObject);

          const raw = readFileSync(
            __dirname + this.publicHome + "/index.html",
            "utf8"
          );
          var html = raw.replace(
            "/*SETTINGS*/",
            `var serverContext=${stringed};`
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

    //console.log (path);

    response.sendFile(__dirname + this.publicHome + path);
  }

  /**
   * https://nodejs.dev/learn/making-http-requests-with-nodejs
   */
  processAPIRequest(type, request, response) {
    console.log("processAPIRequest (" + type + ") => " + request.path);

    //>------------------------------------------------------------------

    if (request.path == "/upload") {
      console.log(
        "Info: we've already processed this, need a better way of handling this situation"
      );
      return;
    }

    //>------------------------------------------------------------------

    /*
     Originally named 'ping', we had to change this because a bunch of browser-addons have a big
     problem with it. It trips up Adblock-Plus and Ghostery. So at least for now it's renamed
     to 'ding'
    */
    if (request.path == "/api/v1/ding") {
      const uptime = process.uptime();

      console.log(this.format(uptime));

      response.json(
        this.generateDataMessage({
          uptime: this.format(uptime),
          version: VERSION,
        })
      );

      return;
    }

    //>------------------------------------------------------------------

    if (request.path == "/api/v1/ontopic") {
      console.log("Processing ontopic request ...");

      this.updateMetrics();

      let msg = request.body;

      console.log(msg);

      console.log("Forwarding request ...");

      this.apiPOSTCall("ontopic", msg, response);

      return;
    }

    //>------------------------------------------------------------------

    response.json(this.generateErrorMessage("Unknown API call made"));
  }

  /**
   *
   * @param {string} assignment
   * @param {'note_to_prose_propmt'|'clarity_prompt'|'grammar'} prompt
   * @returns {Promise<{genre: string, prompt: string}>}
   */
  async getPrompt(assignment, prompt) {
    if (
      !["notes_to_prose_prompt", "clarity_prompt", "grammar"].includes(prompt)
    ) {
      console.error("Not a valid prompt!");
      return { genre: "", prompt: "" };
    }
    try {
      if (!assignment) {
        throw new Error("No assignment for rule data fetch.");
      }
      const [rows] = await this.dbConn.promise().query(
        `SELECT
         JSON_EXTRACT(data, '$.rules.name') AS genre,
         JSON_EXTRACT(data, '$.prompt_templates.${prompt}') AS prompt 
         FROM ${MYSQL_DB}.files
         WHERE id=(SELECT fileid FROM ${MYSQL_DB}.assignments
          WHERE id="${assignment}")`
      );
      if (rows.length <= 0) {
        throw new Error("File lookup error!");
      }
      return rows.at(0);
    } catch (err) {
      console.error(err);
      console.warn("Using default data.");
      try {
        const data = await this.getDefaultRuleData();
        return {
          genre: data.rules.name,
          prompt: data.prompt_templates[prompt],
        };
      } catch (err) {
        console.error(err.message);
        return { genre: "", prompt: "" };
      }
    }
  }
  /**
   *
   */
  run() {
    console.log("run ()");

    console.log("Configuring endpoints ...");

    this.app.get("/configuration/:fileId", async (request, response) => {
      const fileId = request.params.fileId;
      try {
        const data = await this.getFile(fileId);
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

    this.app.post("/configuration", async (request, response) => {
      if (!request.files) {
        response.status(400).send({
          status: false,
          message: "No file uploaded",
        });
      } else {
        console.log("Processing file upload ...");

        try {
          const jsonFile = request.files.file;
          const jsonObject = JSON.parse(jsonFile.data);

          console.log(`Storing: ${jsonFile.name} ("${request.body.date}) ...`);
          const filedata = await this.storeFile(
            jsonFile.name,
            request.body.date,
            jsonObject
          );
          response.json(this.generateDataMessage(filedata));
        } catch (err) {
          console.error(err.message);
          if (err instanceof SyntaxError) {
            // likely bad json
            response.sendStatus(400);
          } else {
            // likely bad db call
            response.sendStatus(500);
          }
        }
      }
    });

    this.app.post("/listfiles", async (_request, response) => {
      try {
        const files = await this.getFiles();
        response.json(this.generateDataMessage(files));
      } catch (err) {
        console.error(err.message);
        response.sendStatus(500);
      }
    });

    this.app.get("/assign", (request, response) => {
      this.processCourseFileAssignment(request, response);
    });

    this.app.post("/getfileid", (request, response) => {
      this.getFileIdFromCourse(request, response);
    });

    this.app.get("/metrics", (request, response) => {
      this.processMetrics(request, response);
    });

    this.app.post("/api/v1/scribe/convert_notes", async (request, response) => {
      const { course_id, notes } = request.body;
      const { genre, prompt } = await this.getPrompt(
        course_id,
        "notes_to_prose_prompt"
      );
      if (!genre || !prompt) {
        response.json({});
        return;
      }
      const content = format(prompt, { genre, notes });
      const prose = await openai.chat.completions.create({
        messages: [
          { role: "system", content: "You are a chatbot" },
          {
            role: "user",
            content,
          },
        ],
        model: "gpt-4",
      });
      response.json(prose);
    });
    this.app.get("/api/v1/scribe/fix_grammar", async (request, response) => {
      const { course_id, text } = request.body;
      const { prompt } = await this.getPrompt(course_id, "grammar");
      if (!prompt) {
        response.json({}); // TODO send error.
        return;
      }
      const content = format(prompt, { text });
      const fixed = await openai.chat.completions.create({
        messages: [
          { role: "system", content: "You are a chatbot" },
          {
            role: "user",
            content,
          },
        ],
        model: "gpt-4",
      });
      response.json(fixed);
    });
    this.app.post("/api/v1/scribe/clarify", async (request, response) => {
      const { course_id, text } = request.body;
      const { prompt } = await this.getPrompt(course_id, "clarity_prompt");
      if (!prompt) {
        response.json({}); // TODO send error.
        return;
      }
      const content = format(prompt, { text });
      const clarified = await openai.chat.completions.create({
        messages: [
          { role: "system", content: "You are a chatbot" },
          {
            role: "user",
            content,
          },
        ],
        model: "gpt-4",
      });
      response.json(clarified);
    });

    const getCourseConfig = async (response, course_id) => {
      if (course_id && course_id.trim().toLowerCase() !== "global") {
        try {
          console.log(`loading rules for ${course_id}`);
          const rules = await this.getFileForCourse(course_id);
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
      "/api/v1/assignments/:course_id/rules",
      async (request, response) => {
        // not currently used, but will be useful for deep-linking.
        const { course_id } = request.params;
        await getCourseConfig(response, course_id);
      }
    );
    this.app.get("/api/v1/rules", async (request, response) => {
      const { course_id } = request.query;
      // TODO use sessions to store/retrieve course_id
      await getCourseConfig(response, course_id);
    });

    this.app.get("/api/v1/*", (request, response) => {
      this.processAPIRequest("GET", request, response);
    });

    this.app.post("/api/v1/*", (request, response) => {
      this.processAPIRequest("POST", request, response);
    });

    this.app.get("/*", (request, response) => {
      this.processRequest(request, response);
    });

    this.app.post("/*", (request, response) => {
      this.processRequest(request, response);
    });

    this.initDBService(() => {
      console.log("Database service initialized, ok to start listening ...");
      this.app.listen(port, () => {
        console.log(`App running on port ${port}.`);
      });
    });
  }
}

var service = new DocuScopeWALTIService();
service.run();
