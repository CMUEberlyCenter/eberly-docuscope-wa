import type { PageContextServer } from 'vike/types';

export function title(pageContext: PageContextServer) {
  return (
    pageContext.t?.('document.title', 'myProse Editor') ?? 'myProse Editor'
  );
}
