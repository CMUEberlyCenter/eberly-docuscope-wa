import { enhance } from '@universal-middleware/core'

export const sessionMiddleware = enhance(
  async (request, context) => {
    // req is attached to the request/context by the framework adapter
    const req = (context as any).req ?? (request as any).req;
    if (req && req.session && req.locals) {
      // If the request has a session and locals, we can attach the litjs token from locals to the session.
      req.session.token = req.locals.token; // added to session for use in telefunc's
    }
    return {
      ...context,
      session: req?.session ?? null,
    };
  },
  { name: 'app:session-middleware', immutable: false }
);
