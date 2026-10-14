// Environment: server
import { getSettings } from '#/server/getSettings';
import { auth } from '#/utils/auth';
import { fromNodeHeaders } from 'better-auth/node';
import type { PageContextServer } from 'vike/types';

export async function onCreatePageContext(pageContext: PageContextServer) {
  pageContext.settings = await getSettings();
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(pageContext.runtime.req.headers),
  });
  pageContext.auth = session;
}
