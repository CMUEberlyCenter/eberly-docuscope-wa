/**
 Via:
  https://blog.logrocket.com/nodejs-expressjs-postgresql-crud-rest-api-example/
  https://node-postgres.com/features/pooling
  https://expressjs.com/en/guide/routing.html
  https://stackabuse.com/get-http-post-body-in-express-js/
  https://github.com/js-kyle/nodejs-lti-provider/blob/master/lti/index.js
  https://github.com/Cvmcosta/ltijs
*/

const PrometheusMetrics = require ('./prometheus.js');

const mysql = require('mysql2');
const express = require('express');
const fs = require('fs');
const http = require('http');
const cors = require('cors');
const fileUpload = require('express-fileupload');
//const fetch = require('node-fetch');

const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');

const port = 8888;

var onTopicRequests=0;
var onTopicRequestsAvg=0;
var onTopicUptime=0;
var onTopicDBRetry=0;
var onTopicService=null;
var onTopicDBMaxRetry=100;

var onTopicDBTimeTaken=0;
var onTopicBackTimeTaken=0;

/**
 * 
 */
class DocuScopeWALTIService {

  /**
   *
   */
  constructor () {
    console.log ("constructor ("+__dirname+")");

    let envPath=__dirname+'/.env';

    console.log (envPath);

    dotenv.config({ path: envPath, debug: true});

    if (dotenv.error) {
      console.error("Dotenv error: " + dotenv.error);
    } else {
      console.log("Dotenv parsed: " + dotenv.parsed);
    }    

    onTopicService=this;

    this.initDBService ();

    this.metrics = new PrometheusMetrics ();
    this.metrics.setMetricObject("eberly_dswa_requests_total",onTopicRequests,this.metrics.METRIC_TYPE_COUNTER,"Number of requests made to the OnTopic backend");
    this.metrics.setMetricObject("eberly_dswa_requests_avg",onTopicRequestsAvg,this.metrics.METRIC_TYPE_COUNTER,"Average number of requests made to the OnTopic backend");
    this.metrics.setMetricObject("eberly_dswa_uptime_total",onTopicUptime,this.metrics.METRIC_TYPE_COUNTER,"DSWA Server uptime");

    setInterval(this.updateMetricsAvg,5*60*1000); // Every 5 minutes
    setInterval(this.updateUptime,1000); // Every second

    this.pjson = require('./package.json');
    console.log("DocuScope-WA front-end proxy version: " + this.pjson.version);

    this.backendHost="localhost";
    if (process.env.DSWA_ONTOPIC_HOST) {
      this.backendHost=process.env.DSWA_ONTOPIC_HOST;
    }

    this.backendPort=5000;
    if (process.env.DSWA_ONTOPIC_PORT) {
      this.backendPort=parseInt (process.env.DSWA_ONTOPIC_PORT);
    } 

    console.log ("Configured the OnTopic backend url to be: " + this.backendHost + ":" + this.backendPort);

    this.token=this.uuidv4();
    this.session=this.uuidv4();
    this.standardHeader = {
      method: "GET",
      cache: 'no-cache'
    };

    this.useLTI=true;
    this.publicHome="/public";
    this.staticHome="/static";

    // See rule retrieval code for more detail
    //this.rules=JSON.parse (fs.readFileSync(__dirname + this.staticHome + '/rules.json', 'utf8'));

    // access config var
    this.backend=process.env.DWA_BACKEND;
    this.mode=process.env.MODE;
    if (!this.mode) {
      this.mode="production";
    }

    this.app = express();

    // Turn off caching for now (detect developer mode!)
    this.app.set('etag', false);
    this.app.use(express.json());
    this.app.use((req, res, next) => {
      res.set('Cache-Control', 'no-store')
      next()
    })

    this.app.use(express.urlencoded({
      extended: true
    }));

    this.processBackendReply=this.processBackendReply.bind(this);

    //this.encodingTest ();
 
    console.log ("Server ready");
  }

  /**
   * https://stackoverflow.com/questions/5396560/how-do-i-convert-special-utf-8-chars-to-their-iso-8859-1-equivalent-using-javasc
   */
  encodingTest () {
    console.log ("encodingTest ()");

    let testString="溫侯神射世間稀，曾向轅門獨解危";

    let testObject={
      string: testString
    }

    let input=JSON.stringify (testObject);

    let escaped=escape (input);

    let encoded=btoa (escaped);

    console.log (encoded);

    let decoded=atob(encoded);

    let unescaped=unescape(decoded);

    let testObjectResult=JSON.parse (unescaped);

    console.log (testObjectResult);

    console.log ("encodingTest () done");
  }

  /**
   *
   */
  initDBService () {
    console.log ("initDBService (retry:"+onTopicDBRetry+" of max "+onTopicDBMaxRetry+")");

    console.log ("Creating db connection: " + process.env.DB_HOST + ":"+process.env.DB_PORT);

    this.dbPool = mysql.createPool({
      connectionLimit : 100, //important
      host: process.env.DB_HOST,
      port: parseInt (process.env.DB_PORT),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      debug    :  false
    });    

    this.dbConn=this.dbPool;

    this.initDB ();
  }

  /**
   *
   */
  initDB () {
    console.log ("initDB (retry:"+onTopicDBRetry+" of max "+onTopicDBMaxRetry+")");

    onTopicService.dbConn.getConnection((err, connection) => {
        if (err) {
          console.log ("Can't connect to database yet, entering retry ... ('"+err.message+"')");
          onTopicDBRetry++;
          if (onTopicDBRetry>onTopicDBMaxRetry) {
            console.log ("Reached max retry");
            throw err;
          }
          setTimeout (onTopicService.initDB,10000);
          return;
        }

        console.log('Connected with thread id: ' + connection.threadId);

        connection.query("CREATE DATABASE IF NOT EXISTS dswa", function (err, result) {
          if (err) throw err;
          console.log("Database created");
        });

        // Need to add a field here to identify the uploader/owner!

        connection.query("CREATE TABLE IF NOT EXISTS dswa.files (id VARCHAR(40) NOT NULL, filename VARCHAR(100) NOT NULL, date VARCHAR(100) NOT NULL, data LONGTEXT NOT NULL, info LONGTEXT NOT NULL,  PRIMARY KEY (id));", function (err, result) {
          if (err) throw err;
          console.log("DSWA file table created");
        });

        connection.query("CREATE TABLE IF NOT EXISTS dswa.assignments (id VARCHAR(40) NOT NULL, fileid VARCHAR(100) NOT NULL, PRIMARY KEY (id));", function (err, result) {
          if (err) throw err;
          console.log("DSWA assignment table created");
        });

        /*
        onTopicService.getFiles (null,null);
        onTopicService.getFile (null,null,"14618");        
        */

        console.log ("Database connection initialized");
    });
  }

  /**
   * 
   */
  getFiles (request,response) {
    console.log ("getFiles ()");

    let startTime=Date.now();

    let that=this;

    this.dbConn.query("select id,filename,date,info from dswa.files", function (err, result, fields) {

      let stopTime = Date.now();

      if (err) {
        //throw err;
        if (response) {
          response.json(that.generateErrorMessage (err.message));
        } else {
          console.log ("Error: " + err.message);
        }
      } else {
        //console.log (result);
        if (response) {
          response.json (that.generateDataMessage (result));
        } else {
          console.log ("Not called in the context of a web request, bump");
        }
      }
    });
  }

  /**
   * 
   */
  getFile (request,response,aCourseId) {
    console.log ("getFile ("+aCourseId+")");

    let startTime=Date.now();

    let that=this;

    let course_id=aCourseId;

    if (!course_id) {
      course_id=request.query.course_id;
    }

    this.dbConn.query("select fileid from dswa.assignments where id='"+course_id+"'", function (err, result, fields) {
      if (err) {
        console.log (err.message);
        if (response) {
          response.json(that.generateErrorMessage (err.message));
        }
        return;
      }

      console.log(result);

      if (result.length>0) {
        let fileId=result[0].fileid;

        that.dbConn.query("select data from dswa.files where id='"+fileId+"'", function (err, result, fields) {
          if (err) {
            that.sendDefaultFile(request,response);
            //throw err;
            return;
          }

          if (result.length>0) {
            let decoded=atob (result[0].data);

            let unescaped=unescape (decoded);

            let jData=JSON.parse (unescaped);

            console.log (jData.info);

            if (response) {
              //response.json (that.generateDataMessage (jData.rules));
              response.json (that.generateDataMessage (jData));
            } else {
              console.log ("Not called in the context of a web request, bump");
            }
          } else {
            if (response) {
              response.json(that.generateErrorMessage ("File data not found for assignment"));
            }
          }

          let stopTime = Date.now();
        });
      } else {
        if (response) {
          response.json(that.generateErrorMessage ("File data not found for assignment"));
        }
      } 
    });    
  }

  /**
   * 
   */
  getFileIdFromCourse (request,response) {
    console.log ("getFileIdFromCourse ()");

    let startTime=Date.now();    

    let that=this;

    let course_id=request.query.course_id;

    this.dbConn.query("select * from dswa.assignments where id='"+course_id+"'", function (err, result, fields) {
      if (err) {
        console.log (err.message);
        return;
      }
      
      console.log("Result: " + result);

      if (result.length==0) {
        //response.json (that.generateDataMessage ("global"));
        let defaultData={
          "fileid": "global"
        };
        response.json (that.generateDataMessage (defaultData));
      } else {
        response.json (that.generateDataMessage (result[0]));
      }

      let stopTime = Date.now();
    });
  }

  /**
   *
   */
  sendDefaultFile(request,response) {
    console.log ("sendDefaultFile ()");

    let ruleData=JSON.parse (fs.readFileSync(__dirname + this.staticHome + '/dswa.json', 'utf8'));

    response.json (this.generateDataMessage (ruleData));    
  }

  /**
   *
   */
  storeFile (request,response,aFilename, aDate, aJSONObject) {
    console.log ("storeFile ()");

    let startTime=Date.now();    

    let that=this;
    
    let id=this.uuidv4 ();

    var data=JSON.stringify (aJSONObject);
    var escaped=escape (data);
    var encoded=btoa (escaped);

    var dataInfo=JSON.stringify (aJSONObject.info);
    var escapedInfo=escape (dataInfo);
    var encodedInfo=btoa (escapedInfo);

    let queryString="INSERT INTO dswa.files (id, filename, date, data, info) VALUES (\""+id+"\",\""+aFilename+"\",\""+aDate+"\",\""+encoded+"\",\""+encodedInfo+"\") ON DUPLICATE KEY UPDATE data='" + encoded + "'";

    this.dbConn.query(queryString, function (err, result, fields) {
      if (err) {
        throw err;
        return;
      }
      //console.log("Result: " + result);
      response.json (that.generateDataMessage ({
        filename: aFilename,
        date: aDate
      }));

      let stopTime = Date.now();
    });    
  }

  /**
   *
   */
  processCourseFileAssignment (request, response) {
    console.log ("processCourseFileAssignment ()");

    let course_id=request.query.course_id;
    let id=request.query.id;

    console.log ("Assigning " + id + " to course: " + course_id);

    let queryString="INSERT INTO dswa.assignments (id, fileid) VALUES (\""+course_id+"\",\""+id+"\") ON DUPLICATE KEY UPDATE fileid='" + id + "'";

    this.dbConn.query(queryString, function (err, result, fields) {
      if (err) {
        throw err;
        return;
      }
    });       
  }  

  /**
   *
   */
  uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   *
   */
  pad(s) {
    return (s < 10 ? '0' : '') + s;
  }

  /**
   *
   */
  format(seconds){
    var hours = Math.floor(seconds / (60*60));
    var minutes = Math.floor(seconds % (60*60) / 60);
    var seconds = Math.floor(seconds % 60);

    return this.pad(hours) + ':' + this.pad(minutes) + ':' + this.pad(seconds);
  }

  /**
   * Here’s an example of a function for signing tokens:
   */
  generateAccessToken(aString) {
    let tSecret="";

    if ((process.env.TOKEN_SECRET=="dummy") || (process.env.TOKEN_SECRET=="")) {
      tSecret=this.uuidv4();
    } else {
      tSecret=process.env.TOKEN_SECRET;
    }
    return jwt.sign({payload: aString}, tSecret, { expiresIn: '1800s' });
  }

  /**
   * https://expressjs.com/en/api.html#req
   */
  debugRequest (request) {
    console.log ("req.baseUrl: " + request.baseUrl);
    console.log ("req.path: " + request.path);
    console.log ('oauth_consumer_key:' + request.body.oauth_consumer_key);
  }

  /**
   *
   */
  generateErrorMessage (aMessage) {
    var error = {
      status: "error",
      message: aMessage
    };

    return (error);
  }


  /**
   *
   */
  generateDataMessage (aDataset) {
    console.log ("generateDataMessage ()");

    var error = {
      status: "success",
      data: aDataset
    };

    return (error);
  }

  /**
   * http://www.passportjs.org/packages/passport-oauth2/
   */
  verifyLTI (request) {
    console.log ("verifyLTI ("+request.body.oauth_consumer_key+")");

    if (request.body.oauth_consumer_key=="") {
      return (false);
    }

    return (true);
  }

  /**
   *
   */
  generateSettingsObject (request) {
    console.log ("generateSettingsObject ()");

    var token=this.generateAccessToken ("dummy");
    var settingsObject={
      lti: {}
    };

    settingsObject.token=token;

    for (var key in request.body) {
      if (request.body.hasOwnProperty(key)) {
        var value=request.body[key];
        settingsObject.lti [key]=value;
      }
    }

    return (settingsObject);
  }

  /**
   *
   */
  evaluateResult (aMessage) {

    return (null);
  }

  /**
   *
   */
  createDataMessage (aData) {
    let message={
      status: "request",
      data: aData
    }
    return (JSON.stringify(message));
  }

  /**
   *
   */
  processMetrics (request, response) {
    //console.log ("processMetrics ()");
      
    let metricsString=this.metrics.build ();

    response.contentType('text/text');
    response.send(metricsString);
  }

  /**
   *
   */
  updateMetrics () {
    onTopicRequests++;
    onTopicRequestsAvg++;

    this.metrics.setMetricObject("eberly_dswa_requests_total",onTopicRequests,this.metrics.METRIC_TYPE_COUNTER,"Number of requests made to the OnTopic backend");
    this.metrics.setMetricObject("eberly_dswa_requests_avg",onTopicRequestsAvg,this.metrics.METRIC_TYPE_COUNTER,"Average number of requests made to the OnTopic backend");    
  }

  /**
   *
   */
  updateMetricsAvg () {
    //console.log ("updateMetricsAvg ()");
    onTopicRequestsAvg=0;
  }

  /**
   *
   */
  updateUptime () {
    //console.log ("updateUptime ()");  
    onTopicUptime+=(1000);

    onTopicService.metrics.setMetricObject("eberly_dswa_uptime_total",onTopicUptime,onTopicService.metrics.METRIC_TYPE_COUNTER,"DSWA Server uptime");
  }  

  /**
   *
   */
  apiPOSTCall (aURL, aData, aResponse) {  
    let url="/api/v1/"+aURL;

    console.log ("apiPOSTCall ("+url+")");

    const data = JSON.stringify(aData);

    const options = {
      hostname: this.backendHost,
      path: url,
      port: 5000,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    }

    const req = http.request(options, (res) => {
      if (res.statusCode==200) {
        let body = "";

        res.on("data", (chunk) => {
          body += chunk;
        });

        res.on("end", () => {
          try {
            let json = JSON.parse(body);
            console.log ("Retrieved valid data from backend, forwarding to frontend ...");
            console.log (json);
            //this.processBackendReply (json);
            aResponse.json (this.generateDataMessage (json));
          } catch (error) {
            console.error(error.message);
          };
        });
      } else {
        console.log ("Server responded with " + res.statusCode);
      }
    })

    req.on('error', error => {
      console.error(error);
    })

    req.write(data);
    req.end();
  }

  /**
   *
   */
  processBackendReply (json) {
    console.log ("processBackendReply ()");
  }

  /**
   * 
   */
  processJSONDownload (request, response) {
    console.log ("processJSONDownload ("+request.query.id+")");    
   
    let fileId=request.query.id;
  
    this.dbConn.query("select data,filename from dswa.files where id='"+fileId+"'", function (err, result, fields) {
      if (result.length>0) {
        let decoded=atob (result[0].data);
        let fileName=result[0].filename;

        response.setHeader('Content-Type', 'application/json');
        response.attachment(fileName);

        let unescaped=unescape (decoded);

        let jData=JSON.parse (unescaped);
        console.log (jData.info);

        response.send(unescaped);
      }
    });
  }

  /**
   *
   */
  processRequest (request, response) {
    console.log ("processRequest ("+request.path+")");

    //>------------------------------------------------------------------

    if (request.path=="/upload") {
      console.log ("Info: we've already processed this, need a better way of handling this situation");
      return;
    }

    //>------------------------------------------------------------------

    if (this.useLTI==true) {
      if ((request.path=="/") || (request.path=="/index.html") || (request.path=="/index.htm")) {
        if (this.verifyLTI (request)==true) {
          var settingsObject=this.generateSettingsObject (request);

          //response.sendFile(__dirname + this.publicHome + request.path);

          //console.log (settingsObject);

          var stringed=JSON.stringify (settingsObject);

          var raw = fs.readFileSync(__dirname + this.publicHome + '/index.html', 'utf8');
          var html = raw.replace ("/*SETTINGS*/","var serverContext="+stringed+";");

          //response.render('main', { html: html });
          response.send(html);
        } else {
          response.sendFile(__dirname + this.staticHome + "/nolti.html");
        }

        return;
      }
    }

    // Strip possible LTI path from file path. We shouldn't need this unless this LTI needs to
    // exist on the server with other add-ons. Instead we should just configure the url to 
    // point to the root of the host

    let path=request.path;

    //>------------------------------------------------------------------

    if (request.path.indexOf ("/lti/activity/docuscope")!=-1) {
      console.log ("We've got an LTI path, stripping ...");
      path=request.path.replace("/lti/activity/docuscope", "/");
    }

    //>------------------------------------------------------------------

    if (path=="/") {
      path="/index.html";
    }

    //>------------------------------------------------------------------

    //console.log (path);

    response.sendFile(__dirname + this.publicHome + path);
  }

  /**
   * https://nodejs.dev/learn/making-http-requests-with-nodejs
   */
  processAPIRequest (type, request, response) {
    console.log ("processAPIRequest ("+type+") => " + request.path);

    //>------------------------------------------------------------------

    if (request.path=="/upload") {
      console.log ("Info: we've already processed this, need a better way of handling this situation");
      return;
    }

    //>------------------------------------------------------------------    

    if (request.path=="/api/v1/rules") {
      // First check to see if we have a course_id parameter, if so load from db

      this.updateMetrics ();

      let course_id=request.query.course_id;

      if (course_id) {
        console.log("Using course id: " + course_id);

        if (course_id!="global") {
          console.log ("Loading rule set from database for course id: " + course_id);

          this.getFile (request,response,course_id);
          return;
        }
      } else {
        console.log ("Error: we do not have a course_id provided, sending default ...");
      }

      // If we do not have a course_id parameter or if it's set to 'global' then fall back to
      // baked-in ruleset

      this.sendDefaultFile (request,response);
      return;
    }

    //>------------------------------------------------------------------    

    /*
     Originally named 'ping', we had to change this because a bunch of browser-addons have a big
     problem with it. It trips up Adblock-Plus and Ghostery. So at least for now it's renamed
     to 'ding'
    */
    if (request.path=="/api/v1/ding") {
      let uptime = process.uptime();

      console.log(this.format(uptime));

      response.json (this.generateDataMessage ({
        uptime: this.format(uptime),
        version: this.pjson.version,
      }));

      return;
    }

    //>------------------------------------------------------------------    

    if (request.path=="/api/v1/ontopic") {
      console.log ("Processing ontopic request ...");

      this.updateMetrics ();

      let msg=request.body;

      if (msg.status=="request") {
        let raw=msg.data.base;
        let decoded=Buffer.from(raw, 'base64');
        let unescaped=unescape (decoded);
        //let unescaped=raw;
      }

      console.log ("Forwarding request ...");

      this.apiPOSTCall ("ontopic", msg, response);

      /* 
      response.json (this.generateDataMessage ({
        sentences: {},
      }));
      */

      return;
    }

    //>------------------------------------------------------------------    

    response.json(this.generateErrorMessage ("Unknown API call made"));
  }

  /**
   *
   */
  run () {
    console.log ("run ()");

    console.log ("Configuring CORS ...");

    this.app.use(cors({
      origin: '*'
    }));    

    this.app.use(fileUpload({
      createParentPath: true
    }));

    console.log ("Configuring endpoints ...");

    this.app.get('/download', (request, response) => {
      console.log ("get() download");
      this.processJSONDownload (request,response);
    });      

    this.app.post('/upload', async (request, response) => {
      console.log ("post() upload");

      try {
        if(!request.files) {
          request.send({
            status: false,
            message: 'No file uploaded'
          });
        } else {
          console.log ("Processing file upload ...");

          let jsonFile=request.files.file;

          var jsonObject = JSON.parse(jsonFile.data.toString('ascii'));

          console.log ("Storing: " + jsonFile.name + " ("+request.body.date+") ...");

          this.storeFile (request, response, jsonFile.name, request.body.date, jsonObject);

          /*
          response.send({
            status: true,
            message: 'File(s) uploaded'
          });
          */
        }
      } catch (err) {
        //response.status(500).send(err.message);
        response.json(this.generateErrorMessage (err.message));
      }
    });    

    this.app.post('/listfiles', (request, response) => {
      console.log ("get() listfiles");
      this.getFiles (request,response);
    });

    this.app.get('/assign', (request, response) => {
      console.log ("get() assign");
      this.processCourseFileAssignment (request,response);
    });       

    this.app.post('/getfile', (request, response) => {
      console.log ("post() getid");
      this.getFile (request,response);
    });

    this.app.post('/getfileid', (request, response) => {
      console.log ("post() getfileid");
      this.getFileIdFromCourse (request,response);
    });

    this.app.get('/metrics', (request, response) => {
      //console.log ("get() metrics");
      this.processMetrics (request,response);
    });    

    this.app.get('/api/v1/*', (request, response) => {
      //console.log ("get(api)");
      this.processAPIRequest ("GET",request,response);
    });

    this.app.post('/api/v1/*', (request, response) => {
      //console.log ("post(api)");
      this.processAPIRequest ("POST",request,response);
    });

    this.app.get('/*', (request, response) => {
      //console.log ("get()");
      this.processRequest (request,response);
    });

    this.app.post('/*', (request, response) => {
      //console.log ("post()");
      this.processRequest (request,response);
    });

    this.app.listen(port, () => {
      console.log(`App running on port ${port}.`);
    });
  }
}

var service=new DocuScopeWALTIService ();
service.run();
