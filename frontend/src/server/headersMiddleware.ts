import { enhance, Get, UniversalMiddleware } from '@universal-middleware/core';

/** Simple middleware to remove CORS headers that interfere with google drive integration. */
export const headersMiddleware = (() =>
  enhance(
    ((_request, _context, _runtime) => {
      return (response) => {
        response.headers.delete('Cross-Origin-Embedder-Policy');
        response.headers.delete('Cross-Origin-Resource-Policy');
        return response;
      };
    }) satisfies UniversalMiddleware,
    {
      name: 'myprose:headers-middleware',
      method: ['GET'],
    }
  )) satisfies Get<[], UniversalMiddleware>;
