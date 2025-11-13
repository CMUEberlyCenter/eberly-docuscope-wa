import type { PageContextServer } from 'vike/types';

export function title(pageContext: PageContextServer) {
  return pageContext.i18n?.t('document.title', 'myProse') ?? 'myProse';
}
