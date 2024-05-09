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
import session from 'express-session';
import { Provider } from 'ltijs';
import { MongoClient, ObjectId } from 'mongodb';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { assignments } from './api/assignments';
import { configurations } from './api/configurations';
import { ontopic } from './api/onTopic';
import { scribe } from './api/scribe';
import changeProposal from './data/change_proposal.json';
import { initializeDatabase } from './data/data';
import { Assignment } from './model/assignment';
import { Rules } from './model/rules';
import { metrics } from './prometheus';
import { LTI_DB, LTI_HOSTNAME, LTI_KEY, LTI_OPTIONS, ONTOPIC_URL, PORT } from './settings';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PUBLIC = join(__dirname, '../../build/app');
const STATIC = '/static';

const client = new MongoClient('mongodb://localhost:27017');

type ContextToken = {
  contextId: string;
  user: string;
  roles: string[];
  path: string;
  targetLinkUri: string;
  context: {
    id: string;
    label?: string;
    title?: string;
    type?: string[]; // ContextType
  };
  resource: {
    title?: string;
    description?: string;
    id: string;
  }
}
type IdToken = {
  iss: string;
  user: string;
  userInfo?: {
    given_name?: string;
    family_name?: string;
    name?: string;
    email?: string;
  }
  platformInfo?: {
    product_family_code: string;
    version: string;
    guid: string;
    name: string;
    description: string;
  };
  clientId: string;
  platformId: string;
  deploymentId: string;
  platformContext: ContextToken;
}

function isInstructor(token: ContextToken): boolean {
  return [
    'http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor'
  ].some(role => token.roles.includes(role));
}

function isStudent(token: ContextToken): boolean {
  return [
    "http://purl.imsglobal.org/vocab/lis/v2/membership#Learner"
  ].some(role => token.roles.includes(role));
}

async function findAssignmentById(id: string): Promise<Assignment> {
  const collection = client.db('docuscope').collection('assignments');
  const assignment: Assignment | null = await collection.findOne<Assignment>({assignment: id});
  if (!assignment) {
    throw new ReferenceError(`Assignment ${id} no found.`)
  }
  return assignment;
}

async function findRulesById(id: string): Promise<Rules> {
  const collection = client.db('docuscope').collection('configurations');
  const rules: Rules | null = await collection.findOne<Rules>({_id: new ObjectId(id)});
  if (!rules) { throw new ReferenceError(`Configuration ${id} not found.`)}
  return rules;
}
declare module "express-session" {
  interface SessionData {
    assignment: Assignment;
    rules: Rules;
  }
}

async function initDatabase(): Promise<void> {
  await client.connect();
  const db = client.db('docuscope');
  const configs = db.collection('configurations');
  const config = await configs.updateOne({"info.name": "Change Proposal"}, {$set: changeProposal}, {upsert: true});
  console.log(config);
  const rules = config.upsertedId;
  const assignments = db.collection('assignments');
  const assignment = await assignments.updateOne({assignment: '5'}, {$set: {
    assignment: '5',
    rules,
    docuscope: false,
    scribe: true,
    notes_to_prose: true,
    logical_flow: true,
    grammar: true,
    copyedit: true,
    expectation: true,
    topics: true,
    text2speech: true,
  } as Assignment}, {upsert: true});
  console.log(assignment);
}

async function __main__() {
  console.log(
    `Configured the OnTopic backend url to be: ${ONTOPIC_URL.toString()}`
  );
  await initializeDatabase();
  await initDatabase();
  console.log('Database service initialized, ok to start listening ...');
  Provider.setup(LTI_KEY, LTI_DB, LTI_OPTIONS);
  Provider.app.set('etag', 'strong');
  Provider.app.use(express.json());
  Provider.app.use(cors({ origin: '*' }));
  Provider.app.use(fileUpload({ createParentPath: true }));
  Provider.app.use(
    express.urlencoded({
      extended: true,
    })
  );
  Provider.app.use(session({secret: 'a good secret'}));

  /////////// Configuration Endpoints //////////////
  Provider.app.use('/api/v1/configurations', configurations);
  ///// Assignment Endpoints /////
  Provider.app.use('/api/v1/assignments', assignments);
  /////////// Scribe Endpoints /////////////
  Provider.app.use('/api/v1/scribe', scribe);
  //// OnTopic Enpoint ////
  Provider.app.use('/api/v1/ontopic', ontopic);
  console.log(`OnTopic: ${ONTOPIC_URL}`);

  Provider.app.all('/api/v1/*', (_request: Request, response: Response) => {
    response.sendStatus(404);
  });

  // Strip possible LTI path from file path. We shouldn't need this unless this LTI needs to
  // exist on the server with other add-ons. Instead we should just configure the url to
  // point to the root of the host
  Provider.app.all('/lti/activity/docuscope', (_req: Request, res: Response) => res.redirect('/'));

  Provider.app.use(metrics);

  // console.log(PUBLIC);
  Provider.app.use(express.static(PUBLIC));
  Provider.whitelist(/assets/, /\.ico$/, /settings/, /api\/v1/, /metrics/, /\//);
  Provider.onConnect(async (token: IdToken, req: Request, res: Response) => {
    // console.log(token);
    // const assignment = await findAssignmentById(token.platformContext.resource.id);
    // const rules = await findRulesById(assignment.rules.toString());
    // console.log(assignment, rules);
    //req.session.assignment = assignment;
    //req.session.rules = rules;
    // req.session['assignment'] = assignment;
    // req.session['rules'] = rules;
    if (token && token.platformContext && isInstructor(token.platformContext)) {
      console.log('isInstructor');
      return res.sendFile(join(PUBLIC, 'deeplink.html'))
    }
    return res.sendFile(join(PUBLIC, 'index.html'))
  });
  Provider.onDeepLinking(async (_token, _req: Request, res: Response) =>
    Provider.redirect(res, '/deeplink.html', { newResource: true }));
  try {
    await Provider.deploy({ port: PORT });
    console.log(` > Ready on ${LTI_HOSTNAME.toString()}`);
  } catch (err) {
    console.error(err);
  }
}
__main__();
