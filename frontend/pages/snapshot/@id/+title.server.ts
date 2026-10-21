import type { PageContextServer } from 'vike/types';

export function title(pageContext: PageContextServer) {
  const en = `myProse Snapshot Review`;
  return pageContext.req.t('document.snapshot.title', en);
}
