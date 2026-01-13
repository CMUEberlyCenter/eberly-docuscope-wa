import type { GlobalContext } from 'vike/types';

export async function onCreateGlobalContext(globalContext: GlobalContext) {
  globalContext.google = {
    analytics: process.env.GOOGLE_ANALYTICS,
    clientId: process.env.GOOGLE_CLIENT_ID,
    apiKey: process.env.GOOGLE_API_KEY,
    appKey: process.env.GOOGLE_APP_KEY,
  };
}
