import type { PageContextServer } from 'vike/types';

export function title(pageContext: PageContextServer) {
  return (
    pageContext.i18n?.t('document.title', {
      ns: 'review',
      defaultValue: 'myProse Review',
    }) ?? 'myProse Review'
  );
}
