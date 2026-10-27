import { enhance, UniversalMiddleware } from '@universal-middleware/core';

/** Middleware to add session information to the request context. */
export const sessionMiddleware = () => {
  return enhance(
    (async (_request, context, runtime) => {
      if (runtime.adapter === 'express') {
        if (!runtime.express.req || !runtime.express.res) {
          throw new Error(
            'Express request and response objects are required for session middleware.'
          );
        }
        // sessionMiddleware(runtime.express.req, runtime.express.res, (err) => {
        // if (err) {
        // throw err;
        // }
        context.session = runtime.express.req.session;
        // });
      }
    }) satisfies UniversalMiddleware,
    {
      name: 'myprose:session-middleware',
      method: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    }
  );
};
