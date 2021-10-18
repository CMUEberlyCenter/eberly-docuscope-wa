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

const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');

const Pool = require('pg').Pool;

const port = 8889;
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

    this.useLTI=true;
    this.publicHome="/public";
    this.staticHome="/static";

    this.rules=fs.readFileSync(__dirname + this.staticHome + '/rules.json', 'utf8');

    // access config var
    this.secret=process.env.TOKEN_SECRET;
    this.mode=process.env.MODE;
    if (!this.mode) {
      this.mode="production";
    }

    this.pool = new Pool({
      user: process.env.POSTGRES_USER, // get from .env
      host: 'localhost',
      database: 'ideate',
      password: process.env.POSTGRES_PASSWORD, // get from .env
      port: 5432,
    }); 

    this.pool.on('error', (err, client) => {
      console.error('Unexpected error on idle client', err)
      process.exit(-1)
    })

    console.log ("Configured secret through .env: " + this.secret);

    this.app = express();

    // Turn off caching for now (detect developer mode!)
    this.app.set('etag', false);
    this.app.use((req, res, next) => {
      res.set('Cache-Control', 'no-store')
      next()
    })
 
    /*
    this.app.use(bodyParser.json());
    this.app.use(
      bodyParser.urlencoded({
        extended: false,
      })
    );
    */

    /*
    this.app.use(formidable()); // to get the LTI header fields
    */

    this.app.use(express.urlencoded({
      extended: true
    }));

    //this.showServerInfo ();
  }

  /**
   * Here’s an example of a function for signing tokens:
   */ 
  generateAccessToken(aString) {
    return jwt.sign({payload: aString}, process.env.TOKEN_SECRET, { expiresIn: '1800s' });
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

    //console.log ("Request body:");
    //console.log (request.body);

    for (var key in request.body) {
      if (request.body.hasOwnProperty(key)) {
        //console.log(key + " -> " + request.body[key]);

        var value=request.body[key];
        settingsObject.lti [key]=value;
      }
    }

    settingsObject ["rules"]=JSON.parse (this.rules);

    return (settingsObject);
  }

  /**
   *
   */
  processRequest (request, response) {
    console.log ("processRequest ()");

    //this.debugRequest (request);

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
   *
   */
  run () {
    console.log ("run ()");

    this.app.get('/*', (request, response) => {
      console.log ("get()");
      this.processRequest (request,response);
    });

    this.app.post('/*', (request, response) => {
      console.log ("post()");
      this.processRequest (request,response);
    });

    this.app.listen(port, () => {
      console.log(`App running on port ${port}.`);
    });
  }
}

var service=new DocuScopeWALTIService ();
service.run();
