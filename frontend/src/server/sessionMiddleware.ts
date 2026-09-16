import { enhance } from '@universal-middleware/core';

/** Middleware to add session information to the request context. */
export const sessionMiddleware = enhance(
  async (_request, context, runtime) => {
    if (runtime.adapter === 'express') {
      const { session } = runtime.express.req;
      return { ...context, session };
    }
  },
  { name: 'myprose:session-middleware' }
);
