import { render } from 'vike/abort';
import { PageContextServer } from 'vike/types';

export const guard = async (pageContext: PageContextServer) => {
  if (!pageContext.launchContext) {
    throw render(401, 'Unauthorized');
  }
};
