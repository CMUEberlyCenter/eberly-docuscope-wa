import { trackScreenView } from '#/client/tracking';
import { PageContextClient } from 'vike/types';

export async function onAfterRenderClient(pageContext: PageContextClient) {
  const {
    routeParams: { id },
    urlPathname,
  } = pageContext;
  const screenName = urlPathname.split('/').pop() || 'unknown_tool';
  trackScreenView({
    screen_name: screenName,
    screen_class: 'Snapshot',
    task_id: id,
  });
}
