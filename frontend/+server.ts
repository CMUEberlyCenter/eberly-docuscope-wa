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
import { IdToken, Provider } from 'ltijs';
import { initReactI18next } from 'react-i18next';
import { serve } from 'telefunc';
import { parse } from 'yaml';
import { handleError } from './src/lib/ProblemDetails';
import { reviews } from './src/server/api/reviews';
import { snapshot } from './src/server/api/snapshot';
// import { initDatabase, insertWritingTask } from './src/server/data/mongo';
import { initPrompts, PROMPTS } from './src/server/data/prompts';
import {
  getSettings,
  // toolSettingsMiddleware,
  // watchSettings,
} from './src/server/getSettings';
import { logger } from './src/server/logger';
import { initializePrometheusMetrics } from './src/server/prometheus'; // gets metrics initialized and registered
import {
  LTI_HOSTNAME,
  MONGO_CLIENT,
  ONTOPIC_URL,
  PORT,
  SESSION_KEY,
} from './src/server/settings';
import {
  basicAuthMiddleware,
  // BasicUserMiddleware,
} from './src/utils/basicAuth';
import { type Server } from 'vike/types';
// import { toNodeHandler } from 'better-auth/node';
// import { auth } from './src/utils/auth';
import { /*vike,*/ toFetchHandler } from '@vikejs/express';
// import { sessionMiddleware } from '#server/sessionMiddleware';
// import { i18nMiddleware } from '#server/i18nMiddleware';
import { ensureLTIInitialized } from '#server/lti.js';
import AdminEN from './public/locales/en/admin.yaml?raw';
import AdminES from './public/locales/es/admin.yaml?raw';
import DeeplinkEN from './public/locales/en/deeplink.yaml?raw';
import DeeplinkES from './public/locales/es/deeplink.yaml?raw';
import ErrorEN from './public/locales/en/error.yaml?raw';
import ErrorES from './public/locales/es/error.yaml?raw';
import ExpectationsEN from './public/locales/en/expectations.yaml?raw';
import ExpectationsES from './public/locales/es/expectations.yaml?raw';
import InstructionsEN from './public/locales/en/instructions.yaml?raw';
import InstructionsES from './public/locales/es/instructions.yaml?raw';
import ReviewEN from './public/locales/en/review.yaml?raw';
import ReviewES from './public/locales/es/review.yaml?raw';
import TranslationEN from './public/locales/en/translation.yaml?raw';
import TranslationES from './public/locales/es/translation.yaml?raw';
// import { headersMiddleware } from '#server/headersMiddleware';
import { renderPage } from 'vike/server';

async function getHandler() {
  logger.info(`OnTopic backend url: ${ONTOPIC_URL.toString()}`);
  await initPrompts();
  const ltiApp = await ensureLTIInitialized();

  const app = express();
  app.set('trust proxy', 1); // needed to work behind a reverse proxy
  app.use((req, res, next) => {
    if (req.path.startsWith('/admin')) {
      return basicAuthMiddleware(req, res, next);
    }
    next();
  });
  // app.all('/api/auth/{*auth}', toNodeHandler(auth));
  // mount json middleware after auth
  app.use(
    cors({
      origin: LTI_HOSTNAME.toString(), // Allow requests from the frontend domain
      // origin: (origin, callback) => {
      //   // Allow requests with no origin (like mobile apps or curl requests)
      //   if (!origin) return callback(null, true);
      //   // Allow requests from the frontend domain
      //   if ([
      //     LTI_HOSTNAME.toString(),
      //     // `http://localhost:${PORT}`, // LTI_HOSTNAME should already cover this.
      //   ].includes(origin)) return callback(null, true);
      //   // Otherwise, block the request
      //   return callback(new ForbiddenError('Not allowed by CORS'));
      // },
      credentials: true, // Allow cookies to be sent with requests
    })
  );

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
      load: 'languageOnly',
      interpolation: { escapeValue: false },
      backend: {
        loadPath: '/locales/{{lng}}/{{ns}}.yaml',
        parse: (data: string) => parse(data),
      },
      resources: {
        en: {
          translation: parse(TranslationEN),
          admin: parse(AdminEN),
          deeplink: parse(DeeplinkEN),
          error: parse(ErrorEN),
          expectations: parse(ExpectationsEN),
          instructions: parse(InstructionsEN),
          review: parse(ReviewEN),
        },
        es: {
          translation: parse(TranslationES),
          admin: parse(AdminES),
          deeplink: parse(DeeplinkES),
          error: parse(ErrorES),
          expectations: parse(ExpectationsES),
          instructions: parse(InstructionsES),
          review: parse(ReviewES),
        },
      },
    });
  app.use(handle(i18n));

  // Prometheus metrics
  initializePrometheusMetrics(app);

  app.use('/api', express.json({ limit: '10mb' }));
  // Reviews API Endpoints
  app.use('/api/v2/review', reviews);
  // Snapshot API Endpoints for static content.
  app.use('/api/v2/snapshot', snapshot);

  // Handle index.html to support old (pre-tool split) genlink links
  // app.get('/index.html', (req: Request, res: Response) => {
  //   if (req.query.writing_task) {
  //     return Provider.redirect(res, `/myprose/${req.query.writing_task}/`);
  //   }
  //   Provider.redirect(res, '/draft');
  // });
  app.all(
    '/_telefunc',
    express.text(), // telefunc encodes the request body as text.
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
          session: req.session, // includes lti token if present.
        } as TelefuncContext,
      });
      res.status(statusCode);
      headers.forEach(([name, value]) => res.setHeader(name, value));
      res.send(body);
    }
  );
  app.use(ltiApp); // res.locals.token is not available in _telefunc even if this is mounted before it.

  // Handle all other routes with Vike
  app.all(
    '{*vike}',
    async (_req, res, next) => {
      // Remove COEP/COOP headers to allow use of Google Drive Picker
      res.removeHeader('Cross-Origin-Embedder-Policy');
      res.removeHeader('Cross-Origin-Resource-Policy');
      next();
    },
    async (req, res, next) => {
      // this should probably be done in onConnect
      const token: IdToken | undefined = res.locals.token;
      req.session.token = token; // add token to session for use in telefuncs
      next();
    },
    async (req: Request, res: Response, next) => {
      const query =
        typeof req.query.writing_task === 'string'
          ? req.query.writing_task
          : undefined;
      const token: IdToken | undefined = req.session.token;
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
        session: req.session,
        settings: await getSettings(),
        writing_task_id,
        user: (req as IBasicAuthedRequest).auth?.user,
      };
      const pageContext = await renderPage(pageContextInit);
      // pageContext.urlParsed?.search;
      if (pageContext.errorWhileRendering) {
        logger.error('Error rendering page:', {
          error: pageContext.errorWhileRendering,
        });
        // return next(new Error(`$${pageContext.errorWhileRendering}`));
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
  // need to do manual middleware to handle dirty stream issues.
  // vike(app, [
  //   headersMiddleware,
  //   toolSettingsMiddleware,
  //   BasicUserMiddleware,
  //   sessionMiddleware,
  //   i18nMiddleware,
  // ]); // TODO convert more to middleware and use here updating context to push into pageContext.

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
