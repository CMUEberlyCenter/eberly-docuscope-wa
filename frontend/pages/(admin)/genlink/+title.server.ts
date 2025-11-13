import type { PageContextServer } from 'vike/types';

export function title(pageContext: PageContextServer) {
  return (
    pageContext.i18n?.t('genlink.title', 'myProse Link Generator') ??
    'myProse Link Generator'
  );
}
