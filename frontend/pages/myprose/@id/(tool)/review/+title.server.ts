import type { PageContextServer } from 'vike/types';

export function title(pageContext: PageContextServer) {
  return pageContext.req.t('document.title', {
    ns: 'review',
    defaultValue: 'myProse Review',
  });
}
