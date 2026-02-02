/* @fileoverview Frontend server main entry.

Sets up and starts the expressjs server for handling requests for the myProse application.
*/
import MongoStore from 'connect-mongo';
import cors from 'cors';
import express, {
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import type { IBasicAuthedRequest } from 'express-basic-auth';
import fileUpload from 'express-fileupload';
import promBundle from 'express-prom-bundle';
import session from 'express-session';
import { readFileSync } from 'fs';
import { readdir, readFile, stat } from 'fs/promises';
import i18n from 'i18next';
import Backend from 'i18next-http-backend';
import { handle, LanguageDetector } from 'i18next-http-middleware';
import { Provider } from 'ltijs';
import { join } from 'path';
import { initReactI18next } from 'react-i18next';
import { renderPage } from 'vike/server';
import { parse } from 'yaml';
import {
  BadRequestError,
  ForbiddenError,
  handleError,
  UnprocessableContentError,
} from './src/lib/ProblemDetails';
import { validateWritingTask } from './src/lib/schemaValidate';
import { type DbWritingTask, isWritingTask } from './src/lib/WritingTask';
import { ontopic } from './src/server/api/onTopic';
import { reviews } from './src/server/api/reviews';
import { scribe } from './src/server/api/scribe';
import { snapshot } from './src/server/api/snapshot';
import { writingTasks } from './src/server/api/tasks';
import { initDatabase, insertWritingTask } from './src/server/data/mongo';
import { initPrompts } from './src/server/data/prompts';
import { watchSettings } from './src/server/getSettings';
import type {
  ContentItemType,
  IdToken,
  LTIPlatform,
} from './src/server/model/lti';
import { metrics } from './src/server/prometheus';
import {
  ADMIN_PASSWORD,
  LTI_DB,
  LTI_HOSTNAME,
  LTI_KEY,
  LTI_OPTIONS,
  MONGO_CLIENT,
  ONTOPIC_URL,
  PLATFORMS_PATH,
  PORT,
  PRODUCT,
  SESSION_KEY,
} from './src/server/settings';
import { basicAuthMiddleware } from './src/utils/basicAuth';
// import { toNodeHandler } from 'better-auth/node';
// import { auth } from './src/utils/auth';

// use process.cwd() to get the current working directory so that
// both development and production environments work correctly.
const __dirname = process.cwd();
const root = __dirname;
/** Root directory for the public server files. */
const PUBLIC = __dirname;

async function __main__() {
  console.log(`OnTopic backend url: ${ONTOPIC_URL.toString()}`);
  const shutdownDatabase = await initDatabase();
  console.log('Database service initialized, ok to start listening ...');
  // Initialize and watch prompts
  const shutdownPrompts = await initPrompts();
  // watch interface settings file
  const shutdownSettings = await watchSettings();

  // Initialize LTI provider and middleware
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
      // if LTI token is present
      if (token.platformContext.custom?.tool) {
        // if tool is specified in deep linking settings, redirect accordingly
        return Provider.redirect(res, `/${token.platformContext.custom.tool}`);
      }
      // default to non-specified writing type drafting tool.
      return Provider.redirect(res, '/draft'); //'/index.html');
    }
    if (req.query.writing_task) {
      return Provider.redirect(res, `/myprose/${req.query.writing_task}/`);
    }
    Provider.redirect(res, '/draft');
    // Provider.redirect(res, '/index'); //'/index.html');
  });
  // Could be used to provide a custom response for invalid tokens
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
    '/deeplink',
    // TODO validate(checkSchema({})),
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        const task = JSON.parse(request.body.file) as DbWritingTask;
        const tool = ['draft', 'review'].includes(request.body.tool)
          ? request.body.tool
          : 'draft';
        const url = new URL(tool, LTI_HOSTNAME);
        const { _id, ...writing_task } = task;
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
        // FIXME task should not be inserted. Use writing_task directly.
        // Requires changing LTI front-end to use writing_task in custom.
        const writing_task_id: string =
          _id ?? (await insertWritingTask(task)).toString();
        const items: ContentItemType[] = [
          {
            type: 'ltiResourceLink',
            // title: writing_task.info.name ?? response.locals.token.platformContext.deepLinkingSettings.title,
            // text: writing_task.rules.overview ?? response.locals.token.platformContext.deepLinkingSettings.text,
            title:
              response.locals.token.platformContext.deepLinkingSettings.title, // #236
            text: `${writing_task.info.name} (${request.i18n.t(`deeplinking.option.${tool}`)})`,
            url: url.toString(),
            icon: {
              url: new URL('logo.svg', LTI_HOSTNAME).toString(),
              width: 500,
              height: 160,
            },
            custom: {
              writing_task_id,
              writing_task: JSON.stringify(writing_task),
              tool,
            },
          },
        ];
        const form = await Provider.DeepLinking.createDeepLinkingForm(
          response.locals.token,
          items
        ); // {message: 'Success'}
        response.send(form);
      } catch (err) {
        next(err);
      }
    }
  );

  // Handle LTI dynamic registration requests
  Provider.onDynamicRegistration(
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.query.openid_configuration) {
          throw new BadRequestError(
            'Missing parameter: "openid_configuration".'
          );
        }
        const message = await Provider.DynamicRegistration.register(
          req.query.openid_configuration,
          req.query.registration_token,
          {
            'https://purl.imsglobal.org/spec/lti-tool-configuration': {
              messages: [
                {
                  type: 'LtiResourceLinkRequest',
                },
                {
                  type: 'LtiDeepLinkingRequest',
                  label: PRODUCT,
                  placements: [
                    'ContentArea',
                    'assignment_selection',
                    'link_selection',
                  ], // Add placements for Canvas
                  supported_types: ['LtiResourceLink'], // match what is produced in deep linking
                },
              ],
            },
          }
        );
        res.setHeader('Content-type', 'text/html');
        res.send(message);
      } catch (err) {
        if (
          err instanceof Error &&
          err.message === 'PLATFORM_ALREADY_REGISTERED'
        ) {
          return next(new ForbiddenError('Platform already registered.'));
        }
        next(err);
      }
    }
  );

  // For platform management, should not be exposed publicly
  // Provider.app.delete(
  //   '/lti/platforms/:platformId',
  //   async (req: Request, res: Response, next: NextFunction) => {
  //     const platformId = req.params.platformId;
  //     try {
  //       if (!platformId) {
  //         throw new BadRequestError('Missing platformId parameter.');
  //       }
  //       if ((await Provider.getPlatformById(platformId)) === false) {
  //         throw new FileNotFoundError('Platform not found.');
  //       }
  //       await Provider.deletePlatformById(platformId);
  //       res.status(204).send(); // No Content
  //     } catch (err) {
  //       console.error('Error deleting platform:', err);
  //       next(err);
  //     }
  //   }
  // );

  /**
   * Endpoint to retrieve the Canvas LTI configuration for the tool.
   */
  Provider.app.get(
    '/lti/configuration',
    async (_req: Request, res: Response) => {
      res.json({
        title: PRODUCT,
        description: 'myProse Editing and Review tools',
        oidc_initiation_url: new URL(
          Provider.loginRoute(),
          LTI_HOSTNAME
        ).toString(),
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
            domain: LTI_HOSTNAME.hostname.split('.').slice(-2).join('.'),
            tool_id: PRODUCT,
            platform: 'canvas.instructure.com',
            privacy_level: 'public',
            settings: {
              text: 'myProse Editing and Review tools',
              labels: {
                en: 'myProse Editing and Review tools',
              },
              icon_url: new URL('/logo.svg', LTI_HOSTNAME).toString(),
              placements: [
                {
                  text: PRODUCT,
                  placement: 'assignment_selection',
                  icon_url: new URL('/logo.svg', LTI_HOSTNAME).toString(),
                  message_type: 'LtiDeepLinkingRequest',
                  target_link_uri: new URL(
                    Provider.appRoute(),
                    LTI_HOSTNAME
                  ).toString(),
                },
                {
                  text: PRODUCT,
                  placement: 'link_selection',
                  icon_url: new URL('/logo.svg', LTI_HOSTNAME).toString(),
                  message_type: 'LtiDeepLinkingRequest',
                  target_link_uri: new URL(
                    Provider.appRoute(),
                    LTI_HOSTNAME
                  ).toString(),
                },
              ],
            },
          },
        ],
        public_jwk_url: new URL(
          Provider.keysetRoute(),
          LTI_HOSTNAME
        ).toString(),
      });
    }
  );

  Provider.whitelist(
    Provider.appRoute(),
    /\w+\.html$/,
    '/genlink', // Eventually to be moved to admin endpoint.  TODO: Public access via LTI only.
    /draft/, // TODO: Eventually to be removed so only available in LTI
    /review/, // TODO: Eventually to be removed so only available in LTI
    /\/snapshot/, // Snapshot viewing.  TODO: This will eventually be the only public tool.
    '/', // TODO: Eventually to be replaced by welcome page with no tools.
    /locales/, // Localization files need to be public
    /myprose/, // These should be the "public" tools.
    /lti/, // additional public lti "well-known" endpoints
    /admin/ // Admin routes, security should be handled outside LTI
  );
  try {
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
          console.log(
            `Registered platform for ${json.url}, clientId: ${json.clientId} from ${path}`
          );
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
        console.log(
          `${active ? '+' : 'o'} Platform: ${name} (${platformId}), URL: ${url}, Active: ${active}`
        );
      });
    }
    const app = express();
    app.use('/admin', basicAuthMiddleware);
    // app.all('/api/auth/{*auth}', toNodeHandler(auth));
    // mount json middleware after auth
    app.use(express.json({ limit: '10mb' }));
    // app.use(cors({ origin: '*' }));
    app.use(cors());

    // Setup sessions
    app.use(
      session({
        cookie: { secure: 'auto' },
        resave: false,
        saveUninitialized: false,
        secret: SESSION_KEY,
        store: MongoStore.create({ mongoUrl: MONGO_CLIENT }),
      })
    );
    // Configure i18n middleware
    i18n
      .use(Backend)
      .use(LanguageDetector)
      .use(initReactI18next)
      .init({
        preload: ['en'],
        fallbackLng: 'en',
        interpolation: { escapeValue: false },
        backend: {
          loadPath: '/locales/{{lng}}/{{ns}}.yaml',
          parse: (data: string) => parse(data),
        },
        resources: {
          en: {
            translation: parse(
              readFileSync(
                join(root, 'public/locales/en/translation.yaml'),
                'utf-8'
              )
            ),
          },
          // 'es': {
          //   translation: parse(
          //     readFileSync(join(root, 'public/locales/es/translation.yaml'), 'utf-8')
          //   )
          // }
        },
      });
    app.use(handle(i18n));

    if (process.env.NODE_ENV === 'production') {
      console.log('Production mode');
      app.use(express.static(join(root, 'dist', 'client')));
    } else {
      const vike = await import('vike/server');
      const { devMiddleware } = await vike.createDevMiddleware({ root });
      app.use(devMiddleware);
    }
    // prometheus metrics
    app.use('/api/', promBundle({ includeMethod: true, includePath: true }));
    // Writing Task/Outline API Endpoints
    app.use('/api/v2/writing_tasks', writingTasks);
    // Scribe API Endpoints
    app.use('/api/v2/scribe', scribe);
    // OnTopic API Endpoints
    app.use('/api/v2/ontopic', ontopic);
    // Reviews API Endpoints
    app.use('/api/v2/review', reviews);
    // Snapshot API Endpoints for static content.
    app.use('/api/v2/snapshot', snapshot);

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
    // Handle all other routes with Vike
    app.all(
      '{*vike}',
      async (_req, res, next) => {
        // Remove COEP/COOP headers to allow use of Google Drive Picker
        res.removeHeader('Cross-Origin-Embedder-Policy');
        res.removeHeader('Cross-Origin-Resource-Policy');
        next();
      },
      async (req: Request, res: Response, next) => {
        // need to do this here as without vike-photon pageContext.runtime.res is not available in hooks.
        const token: IdToken | undefined = res.locals.token;
        const query =
          typeof req.query.writing_task === 'string'
            ? req.query.writing_task
            : undefined;
        const writing_task_id: string | undefined =
          // from LTI
          token?.platformContext.custom?.writing_task_id ||
          // from query parameter
          query ||
          // from session
          req.session.writing_task_id;
        const pageContextInit = {
          urlOriginal: req.url,
          headersOriginal: req.headers,
          i18n: req.i18n,
          token,
          session: req.session,
          writing_task_id,
          user: (req as IBasicAuthedRequest).auth?.user,
          // ltik,
          // headers: {
          //   'Content-Type': 'text/html',
          //   'Cache-Control': 'no-cache',
          // },
        };
        const pageContext = await renderPage(pageContextInit);
        // pageContext.urlParsed?.search;
        if (pageContext.errorWhileRendering) {
          console.error(
            'Error rendering page:',
            pageContext.errorWhileRendering
          );
          return next(new Error(`$${pageContext.errorWhileRendering}`));
        }
        const { httpResponse } = pageContext;
        if (!httpResponse) {
          return next();
        } else {
          const { body, statusCode, headers, earlyHints } = httpResponse;
          if (res.writeEarlyHints) {
            res.writeEarlyHints({
              link: earlyHints.map((hint) => hint.earlyHintLink),
            });
          }
          headers.forEach(([name, value]) => res.setHeader(name, value));
          res.status(statusCode).send(body);
        }
      }
    );

    // Global error handler/formatter
    app.use(handleError);

    const server = app.listen(PORT, () =>
      console.log(
        ` > Ready on ${LTI_HOSTNAME.toString()}\n Admin password: ${ADMIN_PASSWORD}`
      )
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
    // Handle termination signals for graceful shutdown
    ['SIGTERM', 'SIGINT'].forEach((signal) => process.on(signal, shutdown));
    return server;
  } catch (err) {
    console.error(err);
  }
}
export default await __main__();
