import { getSettings } from '#server/getSettings';
import type { PageContext } from 'vike/types';

export async function onCreatePageContext(pageContext: PageContext) {
  // The object pageContext was just created
  pageContext.settings = getSettings();

  // const req = pageContext.req;
  // const session = await auth.api.getSession({ req });
  // pageContext.session = session;

  // return pageContext;
}
