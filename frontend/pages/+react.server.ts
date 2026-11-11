import type { Config, PageContext, PageContextServer } from 'vike/types';

export const react = (pageContext: PageContextServer) => {
  return {
    renderToStreamOptions: {
      streamOptions: {
        nonce: pageContext.cspNonce,
      },
    },
  };
};
