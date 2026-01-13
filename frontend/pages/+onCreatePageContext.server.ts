import type { PageContext } from 'vike/types';
import { getSettings } from '../src/server/getSettings';

export async function onCreatePageContext(pageContext: PageContext) {
  // The object pageContext was just created
  pageContext.settings = getSettings();
}
