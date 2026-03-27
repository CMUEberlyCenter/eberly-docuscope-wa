import { getSettings } from '#server/getSettings';
import type { PageContext } from 'vike/types';

export async function onCreatePageContext(pageContext: PageContext) {
  // The object pageContext was just created
  pageContext.settings = getSettings();
}
