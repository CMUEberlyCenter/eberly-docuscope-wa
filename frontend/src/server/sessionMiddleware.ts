import { enhance, UniversalMiddleware } from '@universal-middleware/core';
import { MongoStore } from 'connect-mongo';
import session from 'express-session';
import { MONGO_CLIENT, SESSION_KEY } from './settings';

/** Middleware to add session information to the request context. */
export const sessionMiddleware = () => {
  const sessionMiddleware = session({
    cookie: { secure: 'auto' },
    resave: false,
    saveUninitialized: false,
    secret: SESSION_KEY,
    store: MongoStore.create({ mongoUrl: MONGO_CLIENT }),
  });

  return enhance(
    (async (_request, context, runtime) => {
      if (runtime.adapter === 'express') {
        if (!runtime.express.req || !runtime.express.res) {
          throw new Error(
            'Express request and response objects are required for session middleware.'
          );
        }
        sessionMiddleware(runtime.express.req, runtime.express.res, (err) => {
          if (err) {
            throw err;
          }
          context.session = runtime.express.req.session;
        });
      }
    }) satisfies UniversalMiddleware,
    {
      name: 'myprose:session-middleware',
      method: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    }
  );
};
