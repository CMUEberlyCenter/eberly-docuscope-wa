import cors from 'cors';
import express, { Request, Response } from 'express';
import fileUpload from 'express-fileupload';
import { Provider } from 'ltijs';
import { MongoClient, ObjectId } from 'mongodb';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { ERROR_INFORMATION } from '../lib/Configuration';
import { assignments } from './api/assignments';
import { configurations } from './api/configurations';
import { ontopic } from './api/onTopic';
import { scribe } from './api/scribe';
import { initializeDatabase } from './data/data';
import { Assignment } from './model/assignment';
import { IdToken, isInstructor } from './model/lti';
import { Rules } from './model/rules';
import { metrics } from './prometheus';
import { LTI_DB, LTI_HOSTNAME, LTI_KEY, LTI_OPTIONS, MONGO_CLIENT, ONTOPIC_URL, PORT } from './settings';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PUBLIC = join(__dirname, '../../build/app');
// const STATIC = '/static';

const client = new MongoClient(MONGO_CLIENT);



async function findAssignmentById(id: string): Promise<Assignment> {
  const collection = client.db('docuscope').collection('assignments');
  const assignment: Assignment | null = await collection.findOne<Assignment>({ assignment: id });
  if (!assignment) {
    throw new ReferenceError(`Assignment ${id} no found.`)
  }
  return assignment;
}

async function findRulesById(id: ObjectId): Promise<Rules> {
  const collection = client.db('docuscope').collection('configurations');
  const rules: Rules | null = await collection.findOne<Rules>({ _id: id });
  if (!rules) { throw new ReferenceError(`Configuration ${id} not found.`) }
  return rules;
}

// declare module "express-session" {
//   interface SessionData {
//     assignment: Assignment;
//     rules: Rules;
//   }
// }

async function initDatabase(): Promise<void> {
  await client.connect();
  // const db = client.db('docuscope');
  // const configs = db.collection('configurations');
  // const config = await configs.updateOne({"info.name": "Change Proposal"}, {$set: changeProposal}, {upsert: true});
  // console.log(config);
  // const rules = config.upsertedId;
  // const assignments = db.collection('assignments');
  // const assignment = await assignments.updateOne({assignment: '5'}, {$set: {
  //   assignment: '5',
  //   rules,
  //   docuscope: false,
  //   scribe: true,
  //   notes_to_prose: true,
  //   logical_flow: true,
  //   grammar: true,
  //   copyedit: true,
  //   expectation: true,
  //   topics: true,
  //   text2speech: true,
  // } as Assignment}, {upsert: true});
  // console.log(assignment);
}

async function __main__() {
  console.log(
    `Configured the OnTopic backend url to be: ${ONTOPIC_URL.toString()}`
  );
  await initializeDatabase();
  await initDatabase();
  console.log('Database service initialized, ok to start listening ...');
  Provider.setup(LTI_KEY, LTI_DB, LTI_OPTIONS);
  // Provider.app.set('etag', 'strong');
  Provider.app.use(express.json());
  Provider.app.use(cors({ origin: '*' }));
  Provider.app.use(fileUpload({ createParentPath: true }));
  Provider.app.use(
    express.urlencoded({
      extended: true,
    })
  );
  // Provider.app.use(session({secret: 'a good secret'}));
  Provider.onConnect(async (token: IdToken, req: Request, res: Response) => {
    // if (token) {
    // return Provider.redirect(res, '/index.html', { query: { assignment: token.platformContext.resource.id }})
    // }
    // const assignment = await findAssignmentById(token.platformContext.resource.id);
    // const rules = await findRulesById(assignment.rules.toString());
    // if (token && token.platformContext && isInstructor(token.platformContext)) {
    //   console.log('isInstructor');
    //   return res.sendFile(join(PUBLIC, 'deeplink.html'))
    // }
    //return res.send(token);
    if (token) {
      return res.sendFile(join(PUBLIC, 'index.html'));
    }
    return Provider.redirect(res, '/');
  });
  // Provider.onInvalidToken(async (req: Request, res: Response) => {
  //   console.log('InvalidToken');
  //   return res.sendFile(join(PUBLIC, 'index.html'));
  // })
  Provider.onDeepLinking(async (_token: IdToken, _req: Request, res: Response) =>
    Provider.redirect(res, '/deeplink.html', { newResource: true }));

  // Configuration Endpoints
  Provider.app.use('/api/v1/configurations', configurations);
  // Assignment Endpoints
  Provider.app.use('/api/v1/assignments', assignments);
  // Scribe Endpoints
  Provider.app.use('/api/v1/scribe', scribe);
  // OnTopic Enpoint
  Provider.app.use('/api/v1/ontopic', ontopic);
  console.log(`OnTopic: ${ONTOPIC_URL}`);

  Provider.app.all('/api/v1/*', (_request: Request, response: Response) => {
    response.sendStatus(404);
  });

  Provider.app.get('/lti/info', async (req: Request, res: Response) => {
    const token: IdToken = res.locals.token;
    try {
      const assignmentData = await findAssignmentById(token.platformContext.resource.id);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _id, rules, assignment, ...tools } = assignmentData;
      const expectations = rules ? await findRulesById(rules) : {
        info: ERROR_INFORMATION
      };

      const ret = {
        instructor: isInstructor(token.platformContext),
        resource: token.platformContext.resource,
        tools,
        expectations: expectations.info
      };
      console.log(ret);
      return res.send(ret);
    } catch (err) {
      if (err instanceof ReferenceError) {
        return res.sendStatus(400);
      }
    }
    return res.send({});
  });

  // Strip possible LTI path from file path. We shouldn't need this unless this LTI needs to
  // exist on the server with other add-ons. Instead we should just configure the url to
  // point to the root of the host
  Provider.app.all('/lti/activity/docuscope', (_req: Request, res: Response) => res.redirect('/'));

  Provider.app.use(metrics);

  // console.log(PUBLIC);
  Provider.app.use(express.static(PUBLIC));
  Provider.whitelist(Provider.appRoute(), /assets/, /\.ico$/, /settings/, /api\/v1/, /metrics/, /index\.html$/);
  try {
    await Provider.deploy({ port: PORT });
    console.log(` > Ready on ${LTI_HOSTNAME.toString()}`);
  } catch (err) {
    console.error(err);
  }
}
__main__();
