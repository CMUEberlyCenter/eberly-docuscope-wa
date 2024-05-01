/**
 Via:
  https://blog.logrocket.com/nodejs-expressjs-postgresql-crud-rest-api-example/
  https://node-postgres.com/features/pooling
  https://expressjs.com/en/guide/routing.html
  https://stackabuse.com/get-http-post-body-in-express-js/
  https://github.com/js-kyle/nodejs-lti-provider/blob/master/lti/index.js
  https://github.com/Cvmcosta/ltijs
*/
import cors from 'cors';
import express, { Request, Response } from 'express';
import fileUpload from 'express-fileupload';
import { readFileSync } from 'fs';
import jwt from 'jsonwebtoken';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { version } from '../../package.json';
import { assignments } from './api/assignments';
import { configurations } from './api/configurations';
import { ontopic } from './api/onTopic';
import { scribe } from './api/scribe';
import { initializeDatabase } from './data/data';
import { router as MetricsRouter } from './prometheus';
import { LTI_HOSTNAME, ONTOPIC_URL, TOKEN_SECRET } from './settings';
import session from 'express-session';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);



/**
 * Here’s an example of a function for signing tokens:
 */
function generateAccessToken(aString: string) {
  const tSecret =
    TOKEN_SECRET === 'dummy' || TOKEN_SECRET === '' ? uuidv4() : TOKEN_SECRET;
  return jwt.sign({ payload: aString }, tSecret, { expiresIn: '1800s' });
}

const PUBLIC = '../../build/app';
const STATIC = '/static';

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
app.use(session());

/////////// Configuration Endpoints //////////////
app.use('/api/v1/configurations', configurations);

///// Assignment Endpoints /////
app.use('/ap1/v1/assignments', assignments);

/////////// Scribe Endpoints /////////////
app.use('/api/v1/scribe', scribe);

//// OnTopic Enpoint ////
app.use('/api/v1/ontopic', ontopic);

app.all('/api/v1/*', (_request: Request, response: Response) => {
  response.sendStatus(404);
});

/**
 *
 */
const useLTI = true;


/**
 * http://www.passportjs.org/packages/passport-oauth2/
 */
function verifyLTI(request: Request) {
  //console.log("verifyLTI (" + request.body.oauth_consumer_key + ")");
  return request.body.oauth_consumer_key !== '';
}

/**
 *
 */
function generateSettingsObject(request: Request) {
  const token = generateAccessToken('dummy');
  return {
    lti: { ...request.body, token },
  };
}

/**
 *
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


  let path = request.path;


  //>------------------------------------------------------------------

  if (path === '/') {
    path = '/index.html';
  }

  //>------------------------------------------------------------------

  response.sendFile(join(__dirname, PUBLIC, path));
}

// Strip possible LTI path from file path. We shouldn't need this unless this LTI needs to
// exist on the server with other add-ons. Instead we should just configure the url to
// point to the root of the host
app.all('/lti/activity/docuscope', (_req, res) => res.redirect('/'));

app.use(MetricsRouter);

type LTIContext = {
  user_id: string;
  roles: string;
  ext_roles?: string;
  cutom_canvas_course_id?: string;
  ext_lti_assignment_id?: string;
  resource_link_id?: string;
  lti_version: 'LTI_1p0';
}
function isLtiRequest(body: LTIContext | unknown): body is LTIContext {
  return typeof body === 'object' && !!body && 'lti_version' in body && body.lti_version === 'LTI-1p0';
}

app.use('/', (request: Request, _response: Response, next) => {
  const lti = request.body;
  if (request.body.oauth_consumer_key !== '' && isLtiRequest(lti)) {
    console.log(lti);
    request.session['lti'] = lti;
  }
  return next();
});

app.get('/*', (request: Request, response: Response) => {
  processRequest(request, response);
});

app.post('/*', (request: Request, response: Response) => {
  processRequest(request, response);
});

async function __main__() {
  console.log(
    `Configured the OnTopic backend url to be: ${ONTOPIC_URL.toString()}`
  );
  await initializeDatabase();
  console.log('Database service initialized, ok to start listening ...');
  app.listen(LTI_HOSTNAME.port, () => {
    console.log(`App running on port ${LTI_HOSTNAME.toString()}.`);
  });
}
__main__();