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
import { ontopic } from './api/onTopic';
import { reviews } from './api/reviews';
import { scribe } from './api/scribe';
import { writingTasks } from './api/tasks';
import {
  findWritingTaskById,
  initDatabase,
  insertWritingTask,
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
  Provider.app.use(cors({ origin: '*' }));
  Provider.app.use(fileUpload({ createParentPath: true }));
  Provider.app.use(
    express.urlencoded({
      extended: true,
    })
  );

  Provider.onConnect(async (token: IdToken, req: Request, res: Response) => {
    if (token) {
      return res.sendFile(join(PUBLIC, 'index.html'));
    }
    Provider.redirect(res, '/index.html');
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
      const task = JSON.parse(request.body.file) as {
        _id?: string;
      } & WritingTask;
      // const url = new URL('/index.html', LTI_HOSTNAME);
      const url = new URL('/', LTI_HOSTNAME);
      // if (!isInstuctor(token)) { throw new Error(); }
      // if (!isWritingTask(task)) { throw new Error(); }
      try {
        const { _id, ...writing_task } = task;
        const writing_task_id: string =
          _id ?? (await insertWritingTask(task)).toString();
        if (writing_task_id) {
          url.searchParams.append('writing_task', writing_task_id);
        }
        const items: ContentItemType[] = [
          {
            type: 'ltiResourceLink',
            url: url.toString(),
            custom: {
              writing_task_id,
              writing_task: JSON.stringify(writing_task),
            },
          },
        ];
        const form = await Provider.DeepLinking.createDeepLinkingForm(
          response.locals.token,
          items
        ); // {message: 'Success'}
        return response.send(form);
      } catch (err) {
        return response.status(500).send(err.message);
      }
    }
  );

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
      const taskId = token.platformContext.custom?.writing_task_id;
      if (!taskId || typeof taskId !== 'string') {
        throw new BadRequestError('No writing task id in custom parameters.');
      }
      const writing_task = await findWritingTaskById(taskId);
      const ret = {
        ...context,
        writing_task,
      };
      res.send(ret);
    } catch (err) {
      console.error(err);
      if (err instanceof ReferenceError) {
        res.status(404).send(FileNotFound(err));
      } else if (err instanceof BadRequestError) {
        res.status(400).send(BadRequest(err));
      } else {
        res.status(500).send(InternalServerError(err));
      }
    }
  });

  Provider.whitelist(Provider.appRoute(), /\w+\.html$/);
  try {
    // await Provider.deploy({ port: PORT });
    await Provider.deploy({ serverless: true });

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
    const app = express();
    app.use(express.json());
    app.use(cors({ origin: '*' }));

    // Writing Task/Outline Endpoints
    app.use('/api/v2/writing_tasks', writingTasks);
    // Scribe Endpoints
    app.use('/api/v2/scribe', scribe);
    // OnTopic Enpoints
    app.use('/api/v2/ontopic', ontopic);
    // Reviews Endpoints
    app.use('/api/v2/reviews', reviews);
    // Metrics
    app.use(metrics);

    // Static directories that do not need to be managed by ltijs
    app.use('/favicon.ico', express.static(`${PUBLIC}/favicon.ico`));
    app.use('/static', express.static(`${PUBLIC}/static`));
    app.use('/assets', express.static(`${PUBLIC}/assets`));
    app.use('/locales', express.static(`${PUBLIC}/locales`));
    app.use('/settings', express.static(`${PUBLIC}/settings`));

    app.use(Provider.app);
    app.use(express.static(PUBLIC));
    app.listen(PORT, () =>
      console.log(` > Ready on ${LTI_HOSTNAME.toString()}`)
    );
  } catch (err) {
    console.error(err);
  }
}
__main__();
