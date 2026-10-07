import { viewPaths } from '@better-auth-ui/core';
import { magicLinkPlugin } from '@better-auth-ui/core/plugins/magic-link';
import { render } from 'vike/abort';
import { PageContextServer } from 'vike/types';

const validAuthPaths = new Set([
  ...Object.values(viewPaths.auth),
  ...Object.values(magicLinkPlugin().viewPaths.auth ?? {}),
]);

export const guard = async ({ routeParams }: PageContextServer) => {
  if (!validAuthPaths.has(routeParams.view)) {
    throw render(404, { message: `Invalid auth view: ${routeParams.view}` });
  }
};
