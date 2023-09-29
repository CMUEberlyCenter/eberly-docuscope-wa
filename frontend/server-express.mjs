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
import info from "./package.json" assert { type: "json" };
import PrometheusMetrics from "./prometheus.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const program = new Command();
program
  .description("Backend server for DocuScope Write and Audit.")
  .addOption(new Option("-p --port <number>", "Port to use for server.").env('PORT'))
  .addOption(new Option("--db <string>", "Database").env('MYSQL_DB').default('dswa'));
// .addOption(new Option("--on-topic <uri>", "OnTopic server").env("DSWA_ONTOPIC_HOST")
program.parse();
const options = program.opts();
const port = !isNaN(parseInt(options.port)) ? parseInt(options.port) : 8888;
const MYSQL_DB = options.db ?? 'dswa';

const ONTOPIC_HOST = process.env.DSWA_ONTOPIC_HOST ?? "localhost";
const ONTOPIC_PORT = isNaN(process.env.DSWA_ONTOPIC_PORT) ? 5000 : parseInt(process.env.DSWA_ONTOPIC_PORT);

const openai = new OpenAI();

var onTopicRequests = 0;
var onTopicRequestsAvg = 0;
var onTopicUptime = 0;
var onTopicResponseAvg = 0;
var onTopicResponseAvgCount = 0;

var onTopicDBRetry = 0;
// var onTopicService = null;
var onTopicDBMaxRetry = 100;

// var onTopicDBTimeTaken = 0;
// var onTopicBackTimeTaken = 0;

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

    console.log(`DocuScope-WA front-end proxy version: ${info.version}`);

    console.log(
      `Configured the OnTopic backend url to be: ${ONTOPIC_HOST}:${ONTOPIC_PORT}`
    );

    this.token = this.uuidv4();
    this.session = this.uuidv4();
    this.standardHeader = {
      method: "GET",
      cache: "no-cache",
    };

    this.useLTI = true;
    this.publicHome = "/public";
    this.staticHome = "/static";

    // See rule retrieval code for more detail
    //this.rules=JSON.parse (fs.readFileSync(__dirname + this.staticHome + '/rules.json', 'utf8'));

    // access config var
    this.mode = process.env.MODE ?? 'production';

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
    try {
      const filename = path.join(__dirname, this.staticHome, "dswa.json");
      const file = await open(filename);
      const ruleFile = await file.readFile({ encoding: "utf8" });
      await file.close();
      return JSON.parse(ruleFile);
    } catch (err) {
      console.log(err.message);
      return {};
    }
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
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
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
   * @param {Request} _request
   * @param {Response} response
   */
  async getFiles(_request, response) {
    try {
      const [rows] = await this.dbConn
        .promise()
        .query(
          `SELECT
             BIN_TO_UUID(id) AS id,
             filename,
             date,
             JSON_EXTRACT(data, '$.info') AS info
            FROM ${MYSQL_DB}.files`
        );
      response.json(this.generateDataMessage(rows));
    } catch (err) {
      console.error(err.message);
      response.sendStatus(500);
    }
  }

  /**
   *
   * @param {Request} request
   * @param {Response} response
   * @param {string?} aCourseId
   */
  async getFile(request, response, aCourseId) {
    const course_id = aCourseId ?? request.query.course_id;
    try {
      const [rows] = await this.dbConn.promise().query(
        `SELECT data FROM ${MYSQL_DB}.files
         WHERE id=(SELECT fileid FROM ${MYSQL_DB}.assignments WHERE id=?)`,
        [course_id]
      );
      if (rows.length <= 0) {
        throw new Error("File data not found for assignment");
      }
      response.json(this.generateDataMessage(rows[0].data));
    } catch (err) {
      console.err(err);
      response.sendStatus(500);
    }
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
      response.json(this.generateErrorMessage(err.message));
    }
  }

  /**
   *
   * @param {Request} _request
   * @param {Response} response
   * @param {string} aFilename
   * @param {string} aDate
   * @param {*} aJSONObject
   */
  async storeFile(_request, response, aFilename, aDate, aJSONObject) {
    try {
      await this.dbConn
        .promise()
        .query(`INSERT INTO ${MYSQL_DB}.files (filename, data) VALUES(?, ?)`, [
          aFilename,
          JSON.stringify(aJSONObject),
        ]);
      response.json(
        this.generateDataMessage({
          filename: aFilename,
          date: aDate,
        })
      );
    } catch (err) {
      response.status(500).send(err.message);
    }
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
      response.sendStatus(200);
    } catch (err) {
      console.error(err.message);
      response.sendStatus(500);
    }
  }

  /**
   *
   */
  uuidv4() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (c) {
        var r = (Math.random() * 16) | 0,
          v = c == "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );
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
    let tSecret = "";

    if (process.env.TOKEN_SECRET == "dummy" || process.env.TOKEN_SECRET == "") {
      tSecret = this.uuidv4();
    } else {
      tSecret = process.env.TOKEN_SECRET;
    }
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
  processMetrics(request, response) {
    //console.log ("processMetrics ()");

    let metricsString = this.metrics.build();

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
    //console.log ("updateMetricsAvg ()");
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
    //console.log ("updateUptime ()");
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
    //console.log ("updateResponseAvg ()");
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
      const [result] = await this.dbConn.promise().query(
        `SELECT data, filename FROM ${MYSQL_DB}.files WHERE id=UUID_TO_BIN(?)`,
        [fileId]);
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
          var settingsObject = this.generateSettingsObject(request);

          //response.sendFile(__dirname + this.publicHome + request.path);

          //console.log (settingsObject);

          var stringed = JSON.stringify(settingsObject);

          var raw = readFileSync(
            __dirname + this.publicHome + "/index.html",
            "utf8"
          );
          var html = raw.replace(
            "/*SETTINGS*/",
            "var serverContext=" + stringed + ";"
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

    if (request.path == "/api/v1/rules") {
      // First check to see if we have a course_id parameter, if so load from db

      this.updateMetrics();

      let course_id = request.query.course_id;

      if (course_id) {
        console.log("Using course id: " + course_id);

        if (course_id.trim().toLowerCase() !== "global") {
          console.log(
            "Loading rule set from database for course id: " + course_id
          );

          this.getFile(request, response, course_id);
          return;
        }
      } else {
        console.log(
          "Error: we do not have a course_id provided, sending default ..."
        );
      }

      // If we do not have a course_id parameter or if it's set to 'global' then fall back to
      // baked-in ruleset

      this.sendDefaultFile(request, response);
    }

    //>------------------------------------------------------------------

    /*
     Originally named 'ping', we had to change this because a bunch of browser-addons have a big
     problem with it. It trips up Adblock-Plus and Ghostery. So at least for now it's renamed
     to 'ding'
    */
    if (request.path == "/api/v1/ding") {
      let uptime = process.uptime();

      console.log(this.format(uptime));

      response.json(
        this.generateDataMessage({
          uptime: this.format(uptime),
          version: info.version,
        })
      );

      return;
    }

    //>------------------------------------------------------------------

    if (request.path == "/api/v1/ontopic") {
      console.log("Processing ontopic request ...");

      this.updateMetrics();

      let msg = request.body;

      /*
      if (msg.status=="request") {
        let raw=msg.data.base;
        let decoded=Buffer.from(raw, 'base64');
        let unescaped=unescape (decoded);
        //let unescaped=raw;
        console.log (unescaped);
      }
      */

      console.log(msg);

      console.log("Forwarding request ...");

      this.apiPOSTCall("ontopic", msg, response);

      /* 
      response.json (this.generateDataMessage ({
        sentences: {},
      }));
      */

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

    this.app.get("/download", (request, response) => {
      console.log("get() download");
      this.processJSONDownload(request, response);
    });

    this.app.post("/upload", async (request, response) => {
      console.log("post() upload");

      try {
        if (!request.files) {
          request.send({
            status: false,
            message: "No file uploaded",
          });
        } else {
          console.log("Processing file upload ...");

          let jsonFile = request.files.file;

          var jsonObject = JSON.parse(jsonFile.data.toString("ascii"));

          console.log(
            "Storing: " + jsonFile.name + " (" + request.body.date + ") ..."
          );

          this.storeFile(
            request,
            response,
            jsonFile.name,
            request.body.date,
            jsonObject
          );

          /*
          response.send({
            status: true,
            message: 'File(s) uploaded'
          });
          */
        }
      } catch (err) {
        //response.status(500).send(err.message);
        response.json(this.generateErrorMessage(err.message));
      }
    });

    this.app.post("/listfiles", (request, response) => {
      console.log("get() listfiles");
      this.getFiles(request, response);
    });

    this.app.get("/assign", (request, response) => {
      console.log("get() assign");
      this.processCourseFileAssignment(request, response);
    });

    this.app.post("/getfile", (request, response) => {
      console.log("post() getid");
      this.getFile(request, response);
    });

    this.app.post("/getfileid", (request, response) => {
      console.log("post() getfileid");
      this.getFileIdFromCourse(request, response);
    });

    this.app.get("/metrics", (request, response) => {
      //console.log ("get() metrics");
      this.processMetrics(request, response);
    });

    this.app.post("/api/v1/scribe/convert_notes", async (request, response) => {
      const { course_id, notes } = request.body;
      const { genre, prompt } = await this.getPrompt(
        course_id,
        "notes_to_prose_prompt"
      );
      // const prompt = data?.prompt_templates?.notes_to_prose_prompt
      //   ?? `I am writing a {genre}, and I want you to generate prose from notes included using the following guidelines.

      // In converting notes to prose, you should uphold the following six principles:

      // Fidelity to Original Content: The prose must strictly adhere to the information presented in the notes. Any specific terminologies, abbreviations, or unique notations should be maintained or appropriately expanded without distortion.

      // Avoidance of Interpretation: The prose should avoid any form of interpretation, qualitative judgments, embellishments, or additional substantive content. The inherent structure and tone of the notes should be preserved.

      // Preservation of Original Tone: While enhancing readability, the prose should not introduce any non-neutral elements, including inadvertent biases, unless they are explicitly present in the notes.

      // Grammatical Correctness: Despite the nature of the notes, the resulting prose should consist of grammatically correct sentences.

      // Preservation of Note Coherence: The prose should reflect the order, coherence, or disjointedness of the original notes. You must not artificially introduce or modify the flow or connection between ideas.

      // Transparency and Limitations: Users should be made aware that the coherence and intelligibility of the produced prose directly correspond to the clarity and structure of the original notes. Disjointed or unclear notes will lead to similarly disjointed prose.

      // Adherence to genre conventions: The prose should be written by using the conventions that are commonly used in the specific genre.

      // Notes: {notes}`;
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
      // const prompt = data?.prompt_templates?.grammar
      //   ?? `Please fix the grammar of the following text: {text}

      // Return a corrected text with a separate explanation of corrections. If there are no grammatical errors, return the original text.

      // Use the following JSON format without any additional texts: {{"original": "this is the original text.", "correction": "this is a fixed text.", "explanattion": "this text provide the reasons for the corrections, if any."}}`;
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
      // const prompt = data?.prompt_templates?.clarify_prompt
      //   ?? "Please improve the clarity of the following text: {text}";
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

    this.app.get("/api/v1/*", (request, response) => {
      //console.log ("get(api)");
      this.processAPIRequest("GET", request, response);
    });

    this.app.post("/api/v1/*", (request, response) => {
      //console.log ("post(api)");
      this.processAPIRequest("POST", request, response);
    });

    this.app.get("/*", (request, response) => {
      //console.log ("get()");
      this.processRequest(request, response);
    });

    this.app.post("/*", (request, response) => {
      //console.log ("post()");
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
