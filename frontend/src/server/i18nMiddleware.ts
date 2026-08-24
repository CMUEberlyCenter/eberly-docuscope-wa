import { enhance } from '@universal-middleware/core';

export const i18nMiddleware = enhance(
  async (request, context) => {
    // req is attached to the request/context by the framework adapter
    const req = (context as any).req ?? (request as any).req;
    if (req && req.i18n) {
      return {
        ...context,
        i18n: req.i18n,
      };
    }
    return context;
  },
  { name: 'app:i18n-middleware', immutable: false }
);
