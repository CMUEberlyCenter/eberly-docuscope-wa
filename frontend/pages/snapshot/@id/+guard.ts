import { redirect } from 'vike/abort';
import type { PageContextServer } from 'vike/types';

export async function guard(pageContext: PageContextServer) {
  const { urlPathname, routeParams } = pageContext;

  // Clean trailing slashes to accurately match /snapshot/123 or /snapshot/123/
  const normalizedPath = urlPathname.replace(/\/$/, '');

  if (normalizedPath === `/snapshot/${routeParams.id}`) {
    // Automatically redirect to the default tab page
    throw redirect(`/snapshot/${routeParams.id}/big_picture`);
  }
}
