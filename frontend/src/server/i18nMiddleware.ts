import { enhance } from '@universal-middleware/core';

/** Middleware to add internationalization information to the request context. */
export const i18nMiddleware = enhance(
  async (_request, context, runtime) => {
    if (runtime.adapter === 'express') {
      const { i18n } = runtime.express.req;
      return { ...context, i18n };
    }
  },
  { name: 'myprose:i18n-middleware' }
);
