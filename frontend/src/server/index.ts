import cors from 'cors';
import express, { Request, Response, Router } from 'express';
import fileUpload from 'express-fileupload';
import { Provider } from 'ltijs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
// import { assignments } from './api/assignments';
import {
  BadRequest,
  InternalServerError
} from '../lib/ProblemDetails';
import { isWritingTask } from '../lib/WritingTask';
import { ontopic } from './api/onTopic';
import { reviews } from './api/reviews';
import { scribe } from './api/scribe';
import { writingTasks } from './api/tasks';
import {
  findAssignmentById,
  initDatabase,
  updateAssignmentWritingTask,
} from './data/mongo';
import { IdToken, isInstructor } from './model/lti';
import { metrics } from './prometheus';
import {
  LTI_DB,
  LTI_HOSTNAME,
  LTI_KEY,
  LTI_OPTIONS,
  ONTOPIC_URL,
  PORT,
} from './settings';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PUBLIC = join(__dirname, '../../build/app');

const assignments = Router();
assignments.post('/', async (request: Request, response: Response) => {
  const token: IdToken = response.locals.token;
  if (!token || !isInstructor(token.platformContext)) {
    // TODO: add other admin roles
    return response.sendStatus(401); // Unauthorized
  }
  if (!request.files) {
    return response.status(400).send(BadRequest('Null files!'));
  }
  try {
    const file = request.files.file;
    if (file instanceof Array) {
      return response
        .sendStatus(400)
        .send(BadRequest('Multiple files unsupported.'));
    }
    const json = JSON.parse(file.data.toString('utf-8'));
    if (!isWritingTask(json)) {
      return response
        .status(400)
        .send(BadRequest('Not a valid writing task specification.'));
    }
    await updateAssignmentWritingTask(token.platformContext.resource.id, json);
  } catch (err) {
    console.error(err);
    if (err instanceof SyntaxError) {
      return response.status(400).send(BadRequest(err));
    }
    return response.status(500).send(InternalServerError(err));
  }
  return response.sendStatus(200);
});

async function __main__() {
  console.log(`OnTopic backend url: ${ONTOPIC_URL.toString()}`);
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
    return Provider.redirect(res, '/index.html');
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
  Provider.app.use('/api/v2/writing_tasks', writingTasks);
  // Assignment Endpoints
  Provider.app.use('/api/v2/assignments', assignments);
  // Scribe Endpoints
  Provider.app.use('/api/v2/scribe', scribe);
  // OnTopic Enpoints
  Provider.app.use('/api/v2/ontopic', ontopic);
  // Reviews Endpoints
  Provider.app.use('/api/v2/reviews', reviews);

  console.log(`OnTopic: ${ONTOPIC_URL}`);

  Provider.app.get('/lti/info', async (req: Request, res: Response) => {
    const token: IdToken = res.locals.token;
    const context = {
      instructor: isInstructor(token.platformContext),
      resource: token.platformContext.resource,
    };
    try {
      const assignmentData = await findAssignmentById(
        token.platformContext.resource.id
      );
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { writing_task, assignment, ...tools } = assignmentData;
      // TODO: remove _id fields.
      const ret = {
        ...context,
        tools,
        writing_task,
      };
      console.log(ret);
      return res.send(ret);
    } catch (err) {
      console.log(err);
      if (err instanceof ReferenceError) {
        return res.sendStatus(400);
      }
    }
    return res.send(context);
  });

  Provider.app.use(metrics);

  // console.log(PUBLIC);
  Provider.app.use(express.static(PUBLIC));
  Provider.whitelist(
    Provider.appRoute(),
    /assets\//,
    /locales\//,
    /\.ico$/,
    /settings/,
    /api\/v.\//,
    /metrics\//,
    /index\.html$/,
    /review\.html$/,
    /expectations\.html$/
  );
  try {
    await Provider.deploy({ port: PORT });
    console.log(` > Ready on ${LTI_HOSTNAME.toString()}`);
  } catch (err) {
    console.error(err);
  }
}
__main__();
