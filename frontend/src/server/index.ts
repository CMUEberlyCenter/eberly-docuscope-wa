import cors from 'cors';
import express, { Request, Response, Router } from 'express';
import fileUpload from 'express-fileupload';
import { Provider } from 'ltijs';
import { MongoClient, ObjectId } from 'mongodb';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { ConfigurationData, ERROR_INFORMATION } from '../lib/Configuration';
import { assignments } from './api/assignments';
// import { configurations } from './api/configurations';
import { PathLike } from 'fs';
import { readFile, readdir, stat } from 'fs/promises';
import { ontopic } from './api/onTopic';
import { scribe } from './api/scribe';
import { initializeDatabase } from './data/data';
import { Assignment } from './model/assignment';
import { IdToken, isInstructor } from './model/lti';
import { Rules } from './model/rules';
import { metrics } from './prometheus';
import {
  EXPECTATIONS,
  LTI_DB,
  LTI_HOSTNAME,
  LTI_KEY,
  LTI_OPTIONS,
  MONGO_CLIENT,
  ONTOPIC_URL,
  PORT,
} from './settings';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PUBLIC = join(__dirname, '../../build/app');
// const STATIC = '/static';

const client = new MongoClient(MONGO_CLIENT);

async function findAssignmentById(id: string): Promise<Assignment> {
  const collection = client.db('docuscope').collection('assignments');
  const assignment: Assignment | null = await collection.findOne<Assignment>({
    assignment: id,
  });
  if (!assignment) {
    throw new ReferenceError(`Assignment ${id} no found.`);
  }
  return assignment;
}

async function findRulesById(id: ObjectId): Promise<Rules> {
  const collection = client.db('docuscope').collection('expectations');
  const rules: Rules | null = await collection.findOne<Rules>({ _id: id });
  if (!rules) {
    throw new ReferenceError(`Expectation file ${id} not found.`);
  }
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
  await updatePublicConfigurations(); // Maybe not best to regenerate public records on startup for production.
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

async function readPublicExpectations(
  dir: PathLike
): Promise<ConfigurationData[]> {
  try {
    const ret: ConfigurationData[] = [];
    const files = await readdir(dir);
    for (const file of files) {
      const path = join(dir.toString(), file);
      const stats = await stat(path);
      if (stats.isFile() && file.endsWith('.json')) {
        const content = await readFile(path, { encoding: 'utf8' });
        const json = JSON.parse(content) as ConfigurationData;
        ret.push(json);
      } else if (stats.isDirectory()) {
        const subdir = await readPublicExpectations(path);
        ret.push(...subdir);
      }
    }
    return ret;
  } catch (err) {
    console.error(err);
    return [];
  }
}

async function findAllPublicFiles() {
  const collection = client.db('docuscope').collection<Rules>('expectations');
  const cursor = collection.find<Rules>({ public: true });
  const ret: Rules[] = [];
  for await (const doc of cursor) {
    ret.push(doc);
  }
  return ret;
}

async function updatePublicConfigurations() {
  const collection = client.db('docuscope').collection<Rules>('expectations');
  const expectations = (await readPublicExpectations(EXPECTATIONS)).map(
    (e) => ({ ...e, public: true })
  );
  expectations.forEach((data) =>
    collection.replaceOne({ public: true, 'info.name': data.info.name }, data, {
      upsert: true,
    })
  );
}

const configurations = Router();
configurations.get('/:fileId', async (request: Request, response: Response) => {
  const fileId = request.params.fileId;
  try {
    return response.send(await findRulesById(new ObjectId(fileId)));
  } catch (err) {
    console.error(err);
    if (err instanceof ReferenceError) {
      return response.sendStatus(404);
    }
    return response.sendStatus(500);
  }
});
configurations.get('/update', async (request: Request, response: Response) => {
  try {
    await updatePublicConfigurations();
    return response.sendStatus(200);
  } catch (err) {
    console.error(err);
    return response.sendStatus(500);
  }
});
configurations.get('', async (request: Request, response: Response) => {
  try {
    const rules = await findAllPublicFiles();
    return response.send(rules); // need everything for preview.
  } catch (err) {
    console.error(err);
    return response.sendStatus(500);
  }
});

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
  Provider.onDeepLinking(
    async (_token: IdToken, _req: Request, res: Response) =>
      Provider.redirect(res, '/deeplink.html', { newResource: true })
  );

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
      const assignmentData = await findAssignmentById(
        token.platformContext.resource.id
      );
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _id, rules, assignment, ...tools } = assignmentData;
      const expectations = rules
        ? await findRulesById(rules)
        : {
            info: ERROR_INFORMATION,
          };

      const ret = {
        instructor: isInstructor(token.platformContext),
        resource: token.platformContext.resource,
        tools,
        expectations,
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
  Provider.app.all('/lti/activity/docuscope', (_req: Request, res: Response) =>
    res.redirect('/')
  );

  Provider.app.use(metrics);

  // console.log(PUBLIC);
  Provider.app.use(express.static(PUBLIC));
  Provider.whitelist(
    Provider.appRoute(),
    /assets/,
    /\.ico$/,
    /settings/,
    /api\/v1/,
    /metrics/,
    /index\.html$/
  );
  try {
    await Provider.deploy({ port: PORT });
    console.log(` > Ready on ${LTI_HOSTNAME.toString()}`);
  } catch (err) {
    console.error(err);
  }
}
__main__();
