import type { PageContextServer } from 'vike/types';

export const onBeforeRoute = (
  pageContext: PageContextServer
) => {
  const locale = pageContext.i18n?.language ?? 'en';
  return {
    pageContext: { locale },
  };
};
