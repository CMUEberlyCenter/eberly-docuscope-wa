import cors from 'cors';
import express, { Request, Response } from 'express';
import fileUpload from 'express-fileupload';
import { readdir, readFile, stat } from 'fs/promises';
import { Provider } from 'ltijs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import {
  BadRequest,
  BadRequestError,
  FileNotFound,
  InternalServerError,
  UnprocessableContent,
  UnprocessableContentError,
} from '../lib/ProblemDetails';
import { validateWritingTask } from '../lib/schemaValidate';
import { isWritingTask, WritingTask } from '../lib/WritingTask';
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
  const shutdownDatabase = await initDatabase();
  console.log('Database service initialized, ok to start listening ...');
  Provider.setup(LTI_KEY, LTI_DB, LTI_OPTIONS);
  Provider.app.use(cors({ origin: '*' }));
  Provider.app.use(fileUpload({ createParentPath: true }));
  Provider.app.use(
    express.urlencoded({
      extended: true,
    })
  );

  Provider.onConnect(async (token: IdToken, _req: Request, res: Response) => {
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
    // TODO validate(checkSchema({})),
    '/deeplink',
    async (request: Request, response: Response) => {
      // const url = new URL('/index.html', LTI_HOSTNAME);
      const url = new URL('/', LTI_HOSTNAME);
      try {
        const task = JSON.parse(request.body.file) as {
          _id?: string;
        } & WritingTask;
        const { _id, ...writing_task } = task;
        const valid = validateWritingTask(task);
        if (!valid) {
          throw new UnprocessableContentError(
            validateWritingTask.errors,
            'Invalid JSON'
          );
        }
        if (!isWritingTask(writing_task)) {
          throw new UnprocessableContentError(
            ['Failed type checking!'],
            'Invalid JSON'
          );
        }
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
        response.send(form);
      } catch (err) {
        if (err instanceof SyntaxError) {
          response.status(422).send(UnprocessableContent(err));
        } else if (err instanceof UnprocessableContentError) {
          response.status(422).send(UnprocessableContent(err));
        } else if (err instanceof BadRequestError) {
          response.status(400).send(BadRequest(err));
        } else {
          response.status(500).send(InternalServerError(err));
        }
      }
    }
  );

  console.log(`OnTopic: ${ONTOPIC_URL}`);

  Provider.app.get('/lti/info', async (_req: Request, res: Response) => {
    const token: IdToken | undefined = res.locals.token;
    const context = {
      instructor: isInstructor(token?.platformContext),
      resource: token?.platformContext?.resource,
      userInfo: token?.userInfo,
      context: token?.platformContext.context,
    };
    try {
      const taskId = token?.platformContext.custom?.writing_task_id;
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
    try {
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
    } catch (err) {
      console.error(err);
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
    app.use('/favicon.ico', express.static(join(PUBLIC, 'favicon.ico')));
    app.use('/static', express.static(join(PUBLIC, 'static')));
    app.use('/assets', express.static(join(PUBLIC, 'assets')));
    app.use('/locales', express.static(join(PUBLIC, 'locales')));
    app.use('/settings', express.static(join(PUBLIC, 'settings')));

    app.use(Provider.app);
    app.use(express.static(PUBLIC));
    const server = app.listen(PORT, () =>
      console.log(` > Ready on ${LTI_HOSTNAME.toString()}`)
    );
    const shutdown = () => {
      server.close(async () => {
        console.log('HTTP server closed.');
        // If you have database connections, close them here
        await shutdownDatabase();
        process.exit(0);
      });
    };
    ['SIGTERM', 'SIGINT', 'SIGINT'].forEach((signal) =>
      process.on(signal, shutdown)
    );
  } catch (err) {
    console.error(err);
  }
}
__main__();
