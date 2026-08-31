// import { getSettings } from '#server/getSettings';
import type { PageContext } from 'vike/types';

export async function onCreatePageContext(pageContext: PageContext) {
  // const {req} = pageContext;
  // pageContext.i18n = req.i18n; // TODO: this is a hack, we should use a proper i18n middleware to set this up.
  // pageContext.session = req.session; // TODO: this is a hack, we should use a proper session middleware to set this up.
  // The object pageContext was just created
  // pageContext.settings = getSettings(); // should already be in pageContext via toolSettingsMiddleware
  // const req = pageContext.req;
  // const session = await auth.api.getSession({ req });
  // pageContext.session = session;
  // console.log(pageContext.settings)
}
