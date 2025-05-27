import type { OnBeforeRouteSync } from 'vike/types';

export const onBeforeRoute: OnBeforeRouteSync = (
  pageContext
): ReturnType<OnBeforeRouteSync> => {
  const locale = pageContext.i18n?.language ?? 'en';
  return {
    pageContext: { locale },
  };
};
