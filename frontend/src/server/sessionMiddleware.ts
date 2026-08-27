import { enhance } from '@universal-middleware/core';

/** Middleware to add session information to the request context. */
export const sessionMiddleware = enhance(
  async (_request, context, runtime) => {
    if (runtime.adapter === 'express') {
      const { session, locals } = runtime.express.req;
      session.token = locals?.token; // added to session for use in telefunc's
      return { ...context, session };
    }
  },
  { name: 'myprose:session-middleware' }
);
