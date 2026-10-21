import type { PageContextServer } from 'vike/types';

export const onBeforeRoute = (pageContext: PageContextServer) => {
  const locale = pageContext.req?.language ?? 'en';
  return {
    pageContext: { locale },
  };
};
