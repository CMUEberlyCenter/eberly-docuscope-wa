// Environment: server
import { getSettings } from '#/server/getSettings';
import { auth } from '#/utils/auth';
import type { PageContextServer } from 'vike/types';

export async function onCreatePageContext(pageContext: PageContextServer) {
  pageContext.settings = await getSettings();
  const session = await auth.api.getSession({
    headers: pageContext.runtime.req.headers as HeadersInit,
  });
  pageContext.auth = session;
}
