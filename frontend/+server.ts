/* @fileoverview Frontend server main entry.

Sets up and starts the expressjs server for handling requests for the myProse application.
*/
import { initDatabase } from '#/server/data/mongo';
import { UniversalHttpHandler } from '#/server/http-handler.service';
import { addAdminUser } from '#/utils/auth';
import { ensureLTIInitialized, LtiMiddleware } from '#server/lti';
import vike, { toFetchHandler } from '@vikejs/express';
import express from 'express';
import i18n from 'i18next';
import { handle, LanguageDetector } from 'i18next-http-middleware';
import { type Server } from 'vike/types';
import { handleError } from './src/lib/ProblemDetails';
import { reviews } from './src/server/api/reviews';
import { logger } from './src/server/logger';
import { I18N_CONFIG } from '#server/i18nMiddleware.ts';
import { telefuncHandler } from '#server/telefuncMiddleware.ts';
import cors from 'cors';
import helmet from 'helmet';
import { LTI_HOSTNAME, ONTOPIC_URL, PORT } from './src/server/settings';

async function getHandler() {
  logger.info(`OnTopic backend url: ${ONTOPIC_URL.toString()}`);
  const shutdownDb = await initDatabase();
  const httpHandler = new UniversalHttpHandler();
  const app = express();
  app.set('trust proxy', 1); // needed to work behind a reverse proxy
  app.use(helmet({ frameguard: false, contentSecurityPolicy: false }));
  const corsMiddleware = cors({
    origin: LTI_HOSTNAME.toString() || true,
    credentials: true,
  });
  app.use(corsMiddleware);
  app.options('*splat', corsMiddleware);
  // app.all('/api/auth/{*auth}', authMiddleware); // handle auth for all /api/auth/* routes
  const provider = await ensureLTIInitialized(httpHandler);
  vike(app, [
    LtiMiddleware(provider),
    telefuncHandler(provider),
    ...httpHandler.routes,
  ]);

  // Configure i18n middleware
  i18n.use(LanguageDetector).init(I18N_CONFIG);
  app.use(handle(i18n));

  app.use('/api/v2', express.json({ limit: '10mb' }));
  // Reviews API Endpoints
  app.use('/api/v2/review', reviews);
  // Snapshot API Endpoints for static content.
  // app.use('/api/v2/snapshot', snapshot);

  // Global error handler/formatter
  app.use(handleError);

  await addAdminUser();

  const gracefulShutdown = async () => {
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
