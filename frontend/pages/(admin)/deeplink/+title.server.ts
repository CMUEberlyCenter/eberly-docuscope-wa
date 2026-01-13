import type { PageContextServer } from 'vike/types';

export function title(pageContext: PageContextServer) {
  return (
    pageContext.i18n?.t('deeplink.title', 'myProse LTI Deeplink') ??
    'myProse LTI Deeplink'
  );
}
