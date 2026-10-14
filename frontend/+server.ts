/* @fileoverview Frontend server main entry.

Sets up and starts the expressjs server for handling requests for the myProse application.
*/
import { initDatabase } from '#/server/data/mongo';
import { headersMiddleware } from '#/server/headersMiddleware';
import { MyExpressHttpHandler } from '#/server/http-handler.service';
import { i18nMiddleware } from '#/server/i18nMiddleware';
import { sessionMiddleware } from '#/server/sessionMiddleware';
import { auth, authMiddleware } from '#/utils/auth';
import { TelefuncContext } from '#lib/TelefuncContext.js';
import {
  ensureLTIInitialized,
  getLTIConfiguration,
  LtiHandler,
} from '#server/lti';
import vike, { toFetchHandler } from '@vikejs/express';
import { fromNodeHeaders } from 'better-auth/node';
import MongoStore from 'connect-mongo';
import express, {
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import session from 'express-session';
import i18n from 'i18next';
import { handle, LanguageDetector } from 'i18next-http-middleware';
import { serve } from 'telefunc';
import { type Server } from 'vike/types';
import { parse } from 'yaml';
import enAdmin from './public/locales/en/admin.yaml?raw';
import enDeeplink from './public/locales/en/deeplink.yaml?raw';
import enError from './public/locales/en/error.yaml?raw';
import enExpectations from './public/locales/en/expectations.yaml?raw';
import enInstructions from './public/locales/en/instructions.yaml?raw';
import enReview from './public/locales/en/review.yaml?raw';
import enTranslation from './public/locales/en/translation.yaml?raw';
import esAdmin from './public/locales/es/admin.yaml?raw';
import esDeeplink from './public/locales/es/deeplink.yaml?raw';
import esError from './public/locales/es/error.yaml?raw';
import esExpectations from './public/locales/es/expectations.yaml?raw';
import esInstructions from './public/locales/es/instructions.yaml?raw';
import esReview from './public/locales/es/review.yaml?raw';
import esTranslation from './public/locales/es/translation.yaml?raw';
import { handleError } from './src/lib/ProblemDetails';
import { reviews } from './src/server/api/reviews';
import { snapshot } from './src/server/api/snapshot';
import { initPrompts, PROMPTS } from './src/server/data/prompts';
import { getSettings } from './src/server/getSettings';
import { logger } from './src/server/logger';
import { initializePrometheusMetrics } from './src/server/prometheus'; // gets metrics initialized and registered
import {
  LTI_HOSTNAME,
  MONGO_CLIENT,
  ONTOPIC_URL,
  PORT,
  SESSION_KEY,
} from './src/server/settings';

async function getHandler() {
  logger.info(`OnTopic backend url: ${ONTOPIC_URL.toString()}`);
  const shutdownPrompts = await initPrompts();
  const shutdownDb = await initDatabase();
  const httpHandler = new MyExpressHttpHandler({
    port: PORT,
    cors: {
      origin: LTI_HOSTNAME.toString(),
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
      credentials: true,
    },
    deeplinkUrl: '/deeplink', // Setup body parsing for deeplink route to handle application/x-www-form-urlencoded content type
  });
  const { app } = httpHandler;
  app.set('trust proxy', 1); // needed to work behind a reverse proxy
  app.all('/api/auth/{*auth}', authMiddleware); // handle auth for all /api/auth/* routes
  const provider = await ensureLTIInitialized(httpHandler);

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
  i18n.use(LanguageDetector).init({
    fallbackLng: 'en',
    load: 'languageOnly',
    interpolation: { escapeValue: false },
    resources: {
      en: {
        translation: parse(enTranslation),
        admin: parse(enAdmin),
        deeplink: parse(enDeeplink),
        error: parse(enError),
        expectations: parse(enExpectations),
        instructions: parse(enInstructions),
        review: parse(enReview),
      },
      es: {
        translation: parse(esTranslation),
        admin: parse(esAdmin),
        deeplink: parse(esDeeplink),
        error: parse(esError),
        expectations: parse(esExpectations),
        instructions: parse(esInstructions),
        review: parse(esReview),
      },
    },
  });
  app.use(handle(i18n));

  // Prometheus metrics
  initializePrometheusMetrics(app);

  app.use('/api/v2', express.json({ limit: '10mb' }));
  // Reviews API Endpoints
  app.use('/api/v2/review', reviews);
  // Snapshot API Endpoints for static content.
  app.use('/api/v2/snapshot', snapshot);

  app.all(
    '/_telefunc',
    express.text(), // telefunc encodes the request body as text.
    async (req: Request, res: Response, _next: NextFunction) => {
      const authSession = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
      const { body, statusCode, headers } = await serve({
        url: req.originalUrl,
        method: req.method,
        body: req.body,
        context: {
          // You can add any arbitrary contextual information here
          // TODO figure out what context is needed for telefuncs and add it here.  For example, session info, user info, etc.
          auth: authSession,
          provider,
          ltik: req.query.ltik,
          sessionId: req.sessionID,
          acceptLanguage: req.headers['accept-language'],
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
  /**
   * Endpoint to retrieve the Canvas LTI static JSON configuration for the tool.
   */
  app.get('/lti/configuration', async (_req: Request, res: Response) => {
    const ltiConfig = getLTIConfiguration();
    res.json(ltiConfig);
  });

  vike(app, [
    headersMiddleware,
    sessionMiddleware,
    i18nMiddleware,
    LtiHandler(provider),
  ]); // TODO convert more to middleware and use here updating context to push into pageContext.

  // Global error handler/formatter
  app.use(handleError);

  const gracefulShutdown = async () => {
    await shutdownPrompts();
    await shutdownDb();
    logger.info('Server shutting down gracefully.');
    process.exit(0);
  };

  process.on('SIGINT', gracefulShutdown);
  process.on('SIGTERM', gracefulShutdown);

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
