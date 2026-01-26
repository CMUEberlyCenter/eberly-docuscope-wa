import type { PageContextServer } from 'vike/types';

export function title(pageContext: PageContextServer) {
  const en = `myProse Snapshot Review`;
  return pageContext.i18n?.t('document.snapshot.title', en) ?? en;
}
