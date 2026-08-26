/* @fileoverview Frontend server main entry.

Sets up and starts the expressjs server for handling requests for the myProse application.
*/
import { TelefuncContext } from '#lib/TelefuncContext.js';
import MongoStore from 'connect-mongo';
import cors from 'cors';
import express, {
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import type { IBasicAuthedRequest } from 'express-basic-auth';
import session from 'express-session';
import i18n from 'i18next';
import Backend from 'i18next-http-backend';
import { handle, LanguageDetector } from 'i18next-http-middleware';
import { Provider } from 'ltijs';
import { initReactI18next } from 'react-i18next';
import { serve } from 'telefunc';
import { parse } from 'yaml';
import { handleError } from './src/lib/ProblemDetails';
import { ontopic } from './src/server/api/onTopic';
import { reviews } from './src/server/api/reviews';
import { snapshot } from './src/server/api/snapshot';
import { writingTasks } from './src/server/api/tasks';
import { initDatabase, insertWritingTask } from './src/server/data/mongo';
import { initPrompts, PROMPTS } from './src/server/data/prompts';
import {
  getSettings,
  toolSettingsMiddleware,
  watchSettings,
} from './src/server/getSettings';
import { logger } from './src/server/logger';
import { initializePrometheusMetrics } from './src/server/prometheus'; // gets metrics initialized and registered
import {
  MONGO_CLIENT,
  ONTOPIC_URL,
  PORT,
  SESSION_KEY,
} from './src/server/settings';
import {
  basicAuthMiddleware,
  BasicUserMiddleware,
} from './src/utils/basicAuth';
import { type Server } from 'vike/types';
// import { toNodeHandler } from 'better-auth/node';
// import { auth } from './src/utils/auth';
import vike, { toFetchHandler } from '@vikejs/express';
import { sessionMiddleware } from '#server/sessionMiddleware.js';
import { i18nMiddleware } from '#server/i18nMiddleware.js';
import { ensureLTIInitialized } from '#server/lti.js';
import EN from './public/locales/en/translation.yaml?raw';
import ES from './public/locales/es/translation.yaml?raw';
import { headersMiddleware } from '#server/headersMiddleware.js';

async function getHandler() {
  logger.info(`OnTopic backend url: ${ONTOPIC_URL.toString()}`);
  await initPrompts();
  await ensureLTIInitialized();

  const app = express();
  app.use((req, res, next) => {
    if (req.path.startsWith('/admin')) {
      return basicAuthMiddleware(req, res, next);
    }
    next();
  });
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
          translation: parse(EN),
        },
        es: {
          translation: parse(ES),
        },
      },
    });
  app.use(handle(i18n));

  // Prometheus metrics
  initializePrometheusMetrics(app);
  // Writing Task/Outline API Endpoints
  app.use('/api/v2/writing_tasks', writingTasks);
  // OnTopic API Endpoints
  app.use('/api/v2/ontopic', ontopic);
  // Reviews API Endpoints
  app.use('/api/v2/review', reviews);
  // Snapshot API Endpoints for static content.
  app.use('/api/v2/snapshot', snapshot);

  // Static directories that do not need to be managed by ltijs
  // app.use('/favicon.ico', express.static(join(PUBLIC, 'favicon.ico')));
  // app.use('/static', express.static(join(PUBLIC, 'static')));
  // app.use('/assets', express.static(join(PUBLIC, 'assets')));
  // app.use('/locales', express.static(join(root, 'public/locales')));
  // app.use('/settings', express.static(join(PUBLIC, 'settings')));

  // app.use(express.static(PUBLIC));
  // Handle index.html to support old (pre-tool split) genlink links
  // app.get('/index.html', (req: Request, res: Response) => {
  //   if (req.query.writing_task) {
  //     return Provider.redirect(res, `/myprose/${req.query.writing_task}/`);
  //   }
  //   Provider.redirect(res, '/draft');
  // });
  app.all(
    '/_telefunc',
    express.text(),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const body = JSON.parse(req.body) as {
          file?: string;
          [key: string]: unknown;
        };
        if (body.file?.includes('/admin/')) {
          return basicAuthMiddleware(req, res, next);
        }
      } catch (err) {
        logger.error('Error parsing telefunc request body', { error: err });
      }
      next();
    },
    async (req: Request, res: Response, _next: NextFunction) => {
      const user = (req as IBasicAuthedRequest).auth?.user;
      // const universalCtx = getContext<{settings: Settings}>(req as any);
      const { body, statusCode, headers } = await serve({
        url: req.originalUrl,
        method: req.method,
        body: req.body,
        context: {
          // You can add any arbitrary contextual information here
          // TODO figure out what context is needed for telefuncs and add it here.  For example, session info, user info, etc.
          gradeService: Provider.Grade,
          sessionId: req.sessionID,
          user,
          isAdmin: user === 'admin',
          acceptLanguage: req.headers['accept-language'],
          // settings: universalCtx.settings,
          settings: await getSettings(),
          prompts: PROMPTS,
          session: req.session,
        } as TelefuncContext,
      });
      res.status(statusCode);
      headers.forEach(([name, value]) => res.setHeader(name, value));
      res.send(body);
    }
  );
  app.use(Provider.app);

  // Handle all other routes with Vike
  // app.all(
  //   '{*vike}',
  //   async (_req, res, next) => {
  //     // Remove COEP/COOP headers to allow use of Google Drive Picker
  //     res.removeHeader('Cross-Origin-Embedder-Policy');
  //     res.removeHeader('Cross-Origin-Resource-Policy');
  //     next();
  //   },
  //   async (req: Request, res: Response, next) => {
  //     // need to do this here as without vike-photon pageContext.runtime.res is not available in hooks.
  //     const token: IdToken | undefined = res.locals.token;
  //     const query =
  //       typeof req.query.writing_task === 'string'
  //         ? req.query.writing_task
  //         : undefined;
  //     const writing_task_id: string | undefined =
  //       // from LTI
  //       token?.platformContext.custom?.writing_task_id ||
  //       // from query parameter
  //       query ||
  //       // from session
  //       req.session.writing_task_id;
  //     const pageContextInit = {
  //       urlOriginal: req.url,
  //       headersOriginal: req.headers,
  //       i18n: req.i18n,
  //       token,
  //       session: req.session,
  //       writing_task_id,
  //       user: (req as IBasicAuthedRequest).auth?.user,
  //       // ltik,
  //       // headers: {
  //       //   'Content-Type': 'text/html',
  //       //   'Cache-Control': 'no-cache',
  //       // },
  //     };
  //     const pageContext = await renderPage(pageContextInit);
  //     // pageContext.urlParsed?.search;
  //     if (pageContext.errorWhileRendering) {
  //       logger.error('Error rendering page:', {
  //         error: pageContext.errorWhileRendering,
  //       });
  //       // return next(new Error(`$${pageContext.errorWhileRendering}`));
  //     }
  //     const { httpResponse } = pageContext;
  //     if (!httpResponse) {
  //       return next();
  //     } else {
  //       const { body, statusCode, headers, earlyHints } = httpResponse;
  //       if (res.writeEarlyHints) {
  //         res.writeEarlyHints({
  //           link: earlyHints.map((hint) => hint.earlyHintLink),
  //         });
  //       }
  //       headers.forEach(([name, value]) => res.setHeader(name, value));
  //       res.status(statusCode).send(body);
  //     }
  //   }
  // );
  vike(app, [
    headersMiddleware,
    toolSettingsMiddleware,
    BasicUserMiddleware,
    sessionMiddleware,
    i18nMiddleware,
  ]); // TODO convert more to middleware and use here updating context to push into pageContext.

  // Global error handler/formatter
  app.use(handleError);

  return app;
}

export default {
  fetch: toFetchHandler(await getHandler()),
  prod: {
    port: PORT,
    onReady(server) {
      const address = server.url;
      logger.info(`Server ready on ${server.url}`, {
        address,
        status: 'ready',
      });
    },
  },
  // onCreate: async (server: HttpServer) => {
  //   // const shutdownDatabase = await initDatabase();
  //   logger.info('Database service initialized, ok to start listening ...', {
  //     status: 'db_ready',
  //   });
  //   // Initialize and watch prompts
  //   const shutdownPrompts = await initPrompts();
  //   // watch interface settings file
  //   const shutdownSettings = await watchSettings();

  //   const shutdown = () => {
  //     server.close(async () => {
  //       logger.info('HTTP server closed.', { status: 'closed' });
  //       // If you have database connections, close them here
  //       // await shutdownDatabase();
  //       await shutdownPrompts();
  //       shutdownSettings();
  //       logger.info('Shutdown complete, exiting process.', {
  //         status: 'shutdown_complete',
  //       });
  //       process.exit(0);
  //     });
  //   };
  //   // Handle termination signals for graceful shutdown
  //   ['SIGTERM', 'SIGINT'].forEach((signal) => process.on(signal, shutdown));
  // }
} as Server;
