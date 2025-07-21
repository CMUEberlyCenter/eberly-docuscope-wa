import MongoDBStore from 'connect-mongodb-session';
import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import fileUpload from 'express-fileupload';
import promBundle from 'express-prom-bundle';
import session from 'express-session';
import { body } from 'express-validator';
import { readFileSync } from 'fs';
import { readdir, readFile, stat } from 'fs/promises';
import i18n from 'i18next';
import Backend from 'i18next-http-backend';
import { handle, LanguageDetector } from 'i18next-http-middleware';
import { Provider } from 'ltijs';
import { join } from 'path';
import { initReactI18next } from 'react-i18next';
import { createDevMiddleware, renderPage } from 'vike/server';
import { parse } from 'yaml';
import {
  BadRequest,
  BadRequestError,
  InternalServerError,
  UnprocessableContent,
  UnprocessableContentError
} from './src/lib/ProblemDetails';
import { validateWritingTask } from './src/lib/schemaValidate';
import { isWritingTask, WritingTask } from './src/lib/WritingTask';
import { ontopic } from './src/server/api/onTopic';
import { reviews } from './src/server/api/reviews';
import { scribe } from './src/server/api/scribe';
import { writingTasks } from './src/server/api/tasks';
import {
  initDatabase,
  insertWritingTask
} from './src/server/data/mongo';
import { initPrompts } from './src/server/data/prompts';
import {
  ContentItemType,
  IdToken,
  LTIPlatform
} from './src/server/model/lti';
import { validate } from './src/server/model/validate';
import { metrics, myproseSessionErrorsTotal } from './src/server/prometheus';
import {
  LTI_DB,
  LTI_HOSTNAME,
  LTI_KEY,
  LTI_OPTIONS,
  MONGO_CLIENT,
  ONTOPIC_URL,
  PLATFORMS_PATH,
  PORT,
  PRODUCT,
  SESSION_KEY
} from './src/server/settings';
import { getSettings, watchSettings } from './src/ToolSettings';

// const __filename = fileURLToPath(import.meta.url);
// use process.cwd() to get the current working directory so that
// both development and production environments work correctly.
const __dirname = process.cwd(); //dirname(__filename);
const root = __dirname;
const PUBLIC = __dirname;// join(__dirname, './build/app');

async function __main__() {
  console.log(`OnTopic backend url: ${ONTOPIC_URL.toString()}`);
  const shutdownDatabase = await initDatabase();
  console.log('Database service initialized, ok to start listening ...');
  // Initialize and watch prompts
  const shutdownPrompts = await initPrompts();
  // watch interface settings file
  const shutdownSettings = await watchSettings();
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
      if (token.platformContext.custom?.tool) {
        return Provider.redirect(res, `/${token.platformContext.custom.tool}`);
      }
      // if instructor and torus (no deep linking) redirect to admin/instructor
      // if (token.platformContext.custom?.writing_task_id) {
      //   console.log('onConnect writing_task_id', token.platformContext.custom.writing_task_id);
      //   Provider.redirect(res, '/myprose/${token.platformContext.custom.writing_task_id}/${token.platformContext.custom.tool ?? 'draft'}');
      // // } else if (token.platformContext.custom?.writing_task) {
      // }
      return Provider.redirect(res, '/draft'); //'/index.html');
    }
    if (req.query.writing_task) {
      return Provider.redirect(res, `/myprose/${req.query.writing_task}/`);
    }
    Provider.redirect(res, '/draft');
    // Provider.redirect(res, '/index'); //'/index.html');
  });
  // Provider.onInvalidToken(async (req: Request, res: Response) => {
  //   console.log('InvalidToken');
  //   return res.sendFile(join(PUBLIC, 'index.html'));
  // })
  Provider.onDeepLinking(
    async (_token: IdToken, _req: Request, res: Response) =>
      // Provider.redirect(res, '/deeplink', { newResource: true })
      Provider.redirect(res, '/deeplink')
  );
  Provider.app.post(
    // TODO validate(checkSchema({})),
    '/deeplink',
    async (request: Request, response: Response) => {
      const url = new URL('/myprose', LTI_HOSTNAME);
      try {
        const task = JSON.parse(request.body.file) as {
          _id?: string;
        } & WritingTask;
        const tool = ['draft', 'review'].includes(request.body.tool) ? request.body.tool : 'draft';
        url.pathname = `/${tool}`;
        const { _id, ...writing_task } = task;
        // url.pathname = `myprose/${_id}/${tool}`;
        const valid = validateWritingTask(writing_task);
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
        // if (writing_task_id) {
        //   url.pathname = `${url.pathname}/${writing_task_id}/${tool}`;
        //   // url.searchParams.append('writing_task', writing_task_id);
        // }
        const items: ContentItemType[] = [
          {
            type: 'ltiResourceLink',
            title: writing_task.info.name ?? response.locals.token.platformContext.deepLinkingSettings.title,
            text: writing_task.rules.overview ?? response.locals.token.platformContext.deepLinkingSettings.text,
            url: url.toString(),
            icon: {
              url: new URL('logo.svg', LTI_HOSTNAME).toString(),
              width: 500,
              height: 160
            },
            custom: {
              writing_task_id,
              writing_task: JSON.stringify(writing_task),
              tool
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

  Provider.onDynamicRegistration(async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.query.openid_configuration) return res.status(400).send({ status: 400, error: 'Bad Request', details: { message: 'Missing parameter: "openid_configuration".' } })
      const message = await Provider.DynamicRegistration.register(req.query.openid_configuration, req.query.registration_token, {
        'https://purl.imsglobal.org/spec/lti-tool-configuration': {
          messages: [
            {
              type: 'LtiResourceLinkRequest',
            },
            {
              type: 'LtiDeepLinkingRequest',
              label: PRODUCT,
              placements: ["ContentArea", "assignment_selection", "link_selection"], // Add placements for Canvas
              supported_types: ['LtiResourceLink'], // to match what is produced in deep linking
            }
          ]
        }
      })
      res.setHeader('Content-type', 'text/html');
      console.log('Dynamic registration message:', message);
      res.send(message);
    } catch (err) {
      if (err.message === 'PLATFORM_ALREADY_REGISTERED') return res.status(403).send({ status: 403, error: 'Forbidden', details: { message: 'Platform already registered.' } })
      return res.status(500).send({ status: 500, error: 'Internal Server Error', details: { message: err.message } })
    }
  });

  Provider.app.delete('/lti/platforms/:platformId', async (req: Request, res: Response) => {
    const platformId = req.params.platformId;
    if (!platformId) {
      return res.status(400).send({ status: 400, error: 'Bad Request', details: { message: 'Missing platformId parameter.' } });
    }
    try {
      await Provider.deletePlatformById(platformId);
      res.status(204).send(); // No Content
    } catch (err) {
      console.error('Error deleting platform:', err);
      return res.status(500).send({ status: 500, error: 'Internal Server'});
    }
  });
  /**
   * Endpoint to retrieve the Canvas LTI configuration for the tool.
   */
  Provider.app.get('/lti/configuration', async (_req: Request, res: Response) => {
    res.json({
      title: PRODUCT,
      description: 'myProse Editing and Review tools',
      oidc_initiation_url: new URL(Provider.loginRoute(), LTI_HOSTNAME).toString(),
      target_link_uri: new URL(Provider.appRoute(), LTI_HOSTNAME).toString(),
      scopes: [
        // "https://purl.imsglobal.org/spec/lti-ags/scope/lineitem",
        // "https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly",
        // "https://purl.imsglobal.org/spec/lti-ags/scope/score",
        // "https://purl.imsglobal.org/spec/lti-nrps/scope/contextmembership.readonly",
        // "https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly",
        // "https://purl.imsglobal.org/spec/lti/scope/noticehandlers",
        // "https://canvas.instructure.com/lti/public_jwk/scope/update"
      ],
      extensions: [
        {
          domain: 'eberly.cmu.edu',
          tool_id: PRODUCT,
          platform: "canvas.instructure.com",
          privacy_level: "public",
          settings: {
            text: 'myProse Editing and Review tools',
            labels: {
              en: "myProse Editing and Review tools",
            },
            icon_url: new URL('/logo.svg', LTI_HOSTNAME).toString(),
            selection_height: 800,
            selection_width: 800,
            placements: [
              {
                text: 'myProse',
                placement: "assignment_selection",
                icon_url: new URL('/logo.svg', LTI_HOSTNAME).toString(),
                message_type: "LtiDeepLinkingRequest",
                target_link_uri: new URL(Provider.appRoute(), LTI_HOSTNAME).toString(),
                selection_height: 600,
                selection_width: 600,
              },
              {
                text: 'myProse',
                placement: "link_selection",
                icon_url: new URL('/logo.svg', LTI_HOSTNAME).toString(),
                message_type: "LtiDeepLinkingRequest",
                target_link_uri: new URL(Provider.appRoute(), LTI_HOSTNAME).toString(),
                selection_height: 600,
                selection_width: 600,
              },
            ]
          }
        }
      ],
      public_jwk_url: new URL(Provider.keysetRoute(), LTI_HOSTNAME).toString(),
    });
  });

  Provider.whitelist(Provider.appRoute(), /\w+\.html$/, '/genlink', /draft/, /review/, '/', /locales/, /myprose/, /lti/);
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
          console.log(`Registered platform for ${json.url}, clientId: ${json.clientId}`);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      const platforms = await Provider.getAllPlatforms();
      platforms.forEach(async (platform) => {
        const platformId = await platform.platformId();
        const name = await platform.platformName();
        const url = await platform.platformUrl();
        const active = await platform.platformActive();
        console.log('Registered platforms:');
        console.log(`${active ? '+' : 'o'} Platform: ${name} (${platformId}), URL: ${url}, Active: ${active}`);
      });
    }
    const app = express();
    app.use(express.json());
    app.use(cors({ origin: '*' }));

    // Setup sessions
    const MongoDBSessionStore = MongoDBStore(session);
    const store = new MongoDBSessionStore({
      uri: MONGO_CLIENT,
      collection: 'sessions',
    });
    store.on('error', (err) => {
      console.error(err);
      myproseSessionErrorsTotal.inc({ error: err.message });
    });
    app.use(
      session({
        secret: SESSION_KEY,
        store,
        resave: false,
        saveUninitialized: true,
        cookie: { secure: 'auto' },
      })
    );
    i18n.use(Backend).use(LanguageDetector).use(initReactI18next).init({
      preload: ['en-US'],
      fallbackLng: 'en-US',
      interpolation: { escapeValue: false },
      backend: {
        loadPath: '/locales/{{lng}}/{{ns}}.yaml',
        parse: (data: string) => parse(data),
      },
      resources: {
        'en-US': {
          translation: parse(
            readFileSync(join(root, 'public/locales/en/translation.yaml'), 'utf-8')
          )
        }
      }
    })
    app.use(handle(i18n));

    if (process.env.NODE_ENV === 'production') {
      console.log('Production mode');
      app.use(express.static(join(root, 'dist', 'client')));
    } else {
      // const vite = await import('vite');
      const { devMiddleware } = await createDevMiddleware({ root });
      app.use(devMiddleware);
    }
    app.use('/api/', promBundle({ includeMethod: true, includePath: true }));
    // Writing Task/Outline Endpoints
    app.use('/api/v2/writing_tasks', writingTasks);
    // Scribe Endpoints
    app.use('/api/v2/scribe', scribe);
    // OnTopic Enpoints
    app.use('/api/v2/ontopic', ontopic);
    // Reviews Endpoints
    app.use('/api/v2/review', reviews);

    type SessionData = {
      document?: string;
      writing_task?: WritingTask;
      writing_task_id?: string;
    }
    app.post('/api/v2/session', validate(body('document').isString()),
      async (req: Request, res: Response) => {
        const { document, writing_task, writing_task_id } = req.body as SessionData;
        if (req.session.document !== document) {
          req.session.document = document;
          req.session.segmented = undefined;
          req.session.analysis = undefined;
        }
        if (writing_task_id && req.session.writing_task_id !== writing_task_id) {
          req.session.writing_task = undefined;
          req.session.writing_task_id = writing_task_id;
        } else if (writing_task && req.session.writing_task !== writing_task) {
          const valid = validateWritingTask(writing_task);
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
          req.session.writing_task = writing_task;
          req.session.writing_task_id = undefined;
          req.session.analysis = undefined;
        }
      });

    // app.use('/api/v2/performance', promptPerformance);
    // Metrics
    app.use(metrics);

    // Static directories that do not need to be managed by ltijs
    app.use('/favicon.ico', express.static(join(PUBLIC, 'favicon.ico')));
    app.use('/static', express.static(join(PUBLIC, 'static')));
    app.use('/assets', express.static(join(PUBLIC, 'assets')));
    app.use('/locales', express.static(join(root, 'public/locales')));
    app.use('/settings', express.static(join(PUBLIC, 'settings')));

    app.use(Provider.app);
    app.use(express.static(PUBLIC));
    // Handle index.html to support old (pre-tool split) genlink links
    app.get('/index.html', (req: Request, res: Response) => {
      if (req.query.writing_task) {
        return Provider.redirect(res, `/myprose/${req.query.writing_task}/`);
      }
      Provider.redirect(res, '/draft');
    });
    app.all('*splat', async (req: Request, res: Response, next) => {
      const token: IdToken | undefined = res.locals.token;
      const query = typeof req.query.writing_task === 'string' ? req.query.writing_task : undefined;
      const writing_task_id: string | undefined = token?.platformContext.custom?.writing_task_id || query || req.session.writing_task_id;
      const pageContextInit = {
        urlOriginal: req.url,
        headersOriginal: req.headers,
        t: req.i18n.t,
        i18n: req.i18n,
        token,
        session: req.session,
        writing_task_id,
        settings: getSettings(),
        // ltik,
        // headers: {
        //   'Content-Type': 'text/html',
        //   'Cache-Control': 'no-cache',
        // },
      };
      const pageContext = await renderPage(pageContextInit);
      pageContext.urlParsed?.search
      if (pageContext.errorWhileRendering) {
        console.error('Error rendering page:', pageContext.errorWhileRendering);
        // return res.status(500).send(InternalServerError('Error rendering page'));
      }
      const { httpResponse } = pageContext;
      if (!httpResponse) {
        return next();
      } else {
        const { body, statusCode, headers, earlyHints } = httpResponse;
        if (res.writeEarlyHints) {
          res.writeEarlyHints({ link: earlyHints.map((hint) => hint.earlyHintLink) });
        }
        headers.forEach(([name, value]) => res.setHeader(name, value));
        res.status(statusCode).send(body);
      }
    });
    const server = app.listen(PORT, () =>
      console.log(` > Ready on ${LTI_HOSTNAME.toString()}`)
    );
    const shutdown = () => {
      server.close(async () => {
        console.log('HTTP server closed.');
        // If you have database connections, close them here
        await shutdownDatabase();
        await shutdownPrompts();
        shutdownSettings();
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
export default (await __main__());
// __main__();
