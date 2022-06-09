/**
 Via:
  https://blog.logrocket.com/nodejs-expressjs-postgresql-crud-rest-api-example/
  https://node-postgres.com/features/pooling
  https://expressjs.com/en/guide/routing.html
  https://stackabuse.com/get-http-post-body-in-express-js/
  https://www.npmjs.com/package/lti-node-library
  https://github.com/js-kyle/nodejs-lti-provider/blob/master/lti/index.js
  https://github.com/Cvmcosta/ltijs
*/

const express = require('express')
const fs = require('fs');
const http = require('http');
//const fetch = require('node-fetch');

const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');

const port = 8888;
//const port = 80;

/**
 *
 */
class DocuScopeWALTIService {

  /**
   *
   */
  constructor () {
    console.log ("constructor ()");

    dotenv.config();

    this.pjson = require('./package.json');
    console.log("DocuScope-WA front-end proxy version: " + this.pjson.version);

    this.backendHost="localhost";
    if (process.env.DSWA_ONTOPIC_HOST) {
      this.backendHost=process.env.DSWA_ONTOPIC_HOST;
    } else {
      this.backendHost=dotenv.DSWA_ONTOPIC_HOST;
      if (this.backendHost=="") {
        this.backendHost="localhost";
      }
    }

    this.backendPort=5000;
    if (process.env.DSWA_ONTOPIC_PORT) {
      this.backendPort=process.env.DSWA_ONTOPIC_PORT;  
    } else {
      this.backendPort=dotenv.DSWA_ONTOPIC_PORT;
      if (this.backendPort=="") {
        this.backendPort=5000;
      }
    }

    console.log ("Configured the OnTopic backend url to be:" + this.backendHost + ": " + this.backendPort);

    this.token=this.uuidv4();
    this.session=this.uuidv4();
    this.standardHeader = {
      method: "GET",
      cache: 'no-cache'
    };

    this.useLTI=true;
    this.publicHome="/public";
    this.staticHome="/static";

    this.rules=JSON.parse (fs.readFileSync(__dirname + this.staticHome + '/rules.json', 'utf8'));

    // access config var
    this.backend=process.env.DWA_BACKEND;
    this.mode=process.env.MODE;
    if (!this.mode) {
      this.mode="production";
    }

    console.log ("Configured secret through .env: " + this.secret);

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
  processRequest (request, response) {
    console.log ("processRequest ()");

    if (this.useLTI==true) {
      if ((request.path=="/") || (request.path=="/index.html") || (request.path=="/index.htm")) {
        if (this.verifyLTI (request)==true) {
          var settingsObject=this.generateSettingsObject (request);

          //response.sendFile(__dirname + this.publicHome + request.path);

          console.log (settingsObject);

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

    response.sendFile(__dirname + this.publicHome + request.path);
  }

  /**
   * https://nodejs.dev/learn/making-http-requests-with-nodejs
   */
  processAPIRequest (type,request, response) {
    console.log ("processAPIRequest ("+type+") => " + request.path);

    if (request.path=="/api/v1/rules") {
      response.json (this.generateDataMessage (this.rules));
      return;
    }

    if (request.path=="/api/v1/ping") {
      let uptime = process.uptime();

      console.log(this.format(uptime));

      response.json (this.generateDataMessage ({
        uptime: this.format(uptime),
        version: this.pjson.version,
      }));

      return;
    }

    if (request.path=="/api/v1/ontopic") {
      console.log ("Processing ontopic request ...");

      let msg=request.body;

      if (msg.status=="request") {
        let raw=msg.data.base;

        let decoded=Buffer.from(raw, 'base64');

        let unescaped=unescape (decoded);
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

    response.json(this.generateErrorMessage ("Unknown API call made"));
  }

  /**
   *
   */
  run () {
    console.log ("run ()");

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
