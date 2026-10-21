import { auth } from '#/utils/auth';
import { errorToProblemDetails } from '#lib/ProblemDetails.ts';
import { TelefuncContext } from '#lib/TelefuncContext.ts';
import { enhance, UniversalHandler } from '@universal-middleware/core';
import { Provider } from 'ltijs';
import { Telefunc } from 'telefunc/node';
import { getSettings } from './getSettings';

export const telefuncHandler = (provider?: Provider) => {
  const telefunc = new Telefunc();
  return enhance(
    (async (request, context, runtime) => {
      try {
        const sessionId =
          runtime.adapter === 'express'
            ? runtime.express.req.sessionID
            : undefined;
        const httpResponse = await telefunc.serve({
          request,
          context: {
            ...context,
            ...runtime,
            auth: await auth.api.getSession({ headers: request.headers }),
            provider,
            ltik: new URL(request.url).searchParams.get('ltik'),
            sessionId,
            acceptLanguage: request.headers.get('accept-language'),
            settings: await getSettings(),
            session:
              runtime.adapter === 'express'
                ? runtime.express.req.session
                : undefined,
          } as TelefuncContext,
        });
        if (!httpResponse) {
          throw new Error('No response from telefunc service.');
        }
        return httpResponse;
      } catch (error) {
        console.error('Error in telefuncHandler:', error);
        const details = errorToProblemDetails(error);
        return Response.json(details, { status: details.status || 500 });
      }
    }) satisfies UniversalHandler,
    {
      name: 'myprose:telefunc-handler',
      path: `/_telefunc`,
      method: ['POST'],
    }
  );
};
