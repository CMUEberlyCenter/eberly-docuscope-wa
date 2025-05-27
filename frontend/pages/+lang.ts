import type { PageContext } from 'vike/types';

export default (pageContext: PageContext & { locale?: string }) =>
  pageContext.locale ?? 'en';
