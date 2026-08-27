import { enhance, type UniversalHandler } from '@universal-middleware/core';
import { Provider } from 'ltijs';
import { Telefunc } from 'telefunc/node';

const telefunc = new Telefunc();
// Note: You can directly define a server middleware instead of defining a Universal Middleware. (You can remove @universal-middleware/* — Vike's scaffolder uses it only to simplify its internal logic, see https://github.com/vikejs/vike/discussions/3116)
export const telefuncHandler = enhance(
  async (request, context, runtime) => {
    const httpResponse = await telefunc.serve({
      request,
      context: {
        gradeService: Provider.Grade,
        sessionId: request.sessionId,
        ...context,
        ...runtime,
      },
    });
    return httpResponse;
  },
  {
    name: 'my-app:telefunc-handler',
    path: `/_telefunc`,
    method: ['GET', 'POST'],
  }
);
