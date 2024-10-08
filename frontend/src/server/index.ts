import cors from 'cors';
import express, { Request, Response } from 'express';
import fileUpload from 'express-fileupload';
import { readdir, readFile, stat } from 'fs/promises';
import { Provider } from 'ltijs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import {
  BadRequest,
  FileNotFound,
  InternalServerError,
} from '../lib/ProblemDetails';
import { WritingTask } from '../lib/WritingTask';
import { assignments } from './api/assignments';
import { ontopic } from './api/onTopic';
import { reviews } from './api/reviews';
import { scribe } from './api/scribe';
import { writingTasks } from './api/tasks';
import {
  findAssignmentById,
  initDatabase,
  updateAssignmentWritingTask,
} from './data/mongo';
import {
  ContentItemType,
  IdToken,
  isInstructor,
  LTIPlatform,
} from './model/lti';
import { metrics } from './prometheus';
import {
  LTI_DB,
  LTI_HOSTNAME,
  LTI_KEY,
  LTI_OPTIONS,
  ONTOPIC_URL,
  PLATFORMS_PATH,
  PORT,
} from './settings';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PUBLIC = join(__dirname, '../../build/app');

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
      //  res.sendFile(join(PUBLIC, 'deeplink.html'))
      // Provider.redirect(res, '/deeplink', { newResource: true })
      Provider.redirect(res, '/deeplink')
  );
  Provider.app.get('/deeplink', async (_req: Request, res: Response) =>
    res.sendFile(join(PUBLIC, 'deeplink.html'))
  );
  Provider.app.post(
    '/deeplink',
    async (request: Request, response: Response) => {
      const task = JSON.parse(request.body.file) as WritingTask;
      // const url = new URL('/index.html', LTI_HOSTNAME);
      const url = new URL('/', LTI_HOSTNAME);
      // if (!isInstuctor(token)) { throw new Error(); }
      // if (!isWritingTask(task)) { throw new Error(); }
      // TODO try...catch
      const assignmentId = await updateAssignmentWritingTask(
        response.locals.token.platformContext.context.id,
        task
      );
      if (assignmentId) {
        url.searchParams.append('assignment', assignmentId.toString());
      }
      const items: ContentItemType[] = [
        {
          type: 'ltiResourceLink',
          url: url.toString(),
          custom: {
            assignment: assignmentId?.toString() ?? 'NULL',
            // writing_task: task  // TODO store here?
          },
        },
      ];
      const form = await Provider.DeepLinking.createDeepLinkingForm(
        response.locals.token,
        items
      ); // {message: 'Success'}
      return response.send(form);
    }
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

  class BadRequestError extends Error {
    constructor(message?: string) {
      super(message);
    }
  }

  Provider.app.get('/lti/info', async (req: Request, res: Response) => {
    const token: IdToken = res.locals.token;
    const context = {
      instructor: isInstructor(token.platformContext),
      resource: token.platformContext.resource,
    };
    try {
      const assignmentId = token.platformContext.custom?.assignment;
      if (!assignmentId) {
        throw new BadRequestError('No assignment id in custom parameters.');
      }
      const assignmentData = await findAssignmentById(assignmentId);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { writing_task, assignment, ...tools } = assignmentData;
      // TODO: remove _id fields.
      const ret = {
        ...context,
        tools,
        writing_task,
      };
      // console.log(ret);
      return res.send(ret);
    } catch (err) {
      console.error(err);
      if (err instanceof ReferenceError) {
        return res.status(404).send(FileNotFound(err));
      }
      if (err instanceof BadRequestError) {
        return res.status(400).send(BadRequest(err));
      }
      return res.status(500).send(InternalServerError(err));
    }
  });

  Provider.app.use(metrics);

  Provider.app.use(express.static(PUBLIC));
  Provider.whitelist(
    Provider.appRoute(),
    /assets\//,
    /locales\//,
    /\.ico$/,
    /\.svg$/,
    /\.png$/,
    /settings/,
    /api\/v.\//,
    /metrics\//,
    /index\.html$/,
    /review\.html$/,
    /expectations\.html$/
  );
  try {
    await Provider.deploy({ port: PORT });

    // Register manually configured platforms.
    const files = await readdir(PLATFORMS_PATH);
    for (const file of files) {
      const path = join(PLATFORMS_PATH, file);
      const stats = await stat(path);
      if (stats.isFile() && file.endsWith('.json')) {
        const content = await readFile(path, { encoding: 'utf8' });
        const json = JSON.parse(content) as LTIPlatform;
        await Provider.registerPlatform(json);
      }
    }

    console.log(` > Ready on ${LTI_HOSTNAME.toString()}`);
  } catch (err) {
    console.error(err);
  }
}
__main__();
