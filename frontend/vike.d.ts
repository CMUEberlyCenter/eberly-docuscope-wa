import type { SessionData } from 'express-session';
import type { i18n } from 'i18next';
import type { Settings } from './src/lib/ToolSettings';
import type { IdToken } from './src/server/model/lti';

interface GoogleSettings {
  analytics?: string;
  clientId?: string;
  apiKey?: string;
  appKey?: string;
}

declare global {
  namespace Vike {
    interface GlobalContext {
      google?: GoogleSettings;
    }
    interface PageContextServer {
      i18n?: i18n;
      token?: IdToken;
      session?: SessionData;
      writing_task_id?: string;
      settings?: Settings;
    }
    interface PageContext {
      locale?: string;
      settings?: Settings;
      google?: GoogleSettings;
      user?: string;
      abortReason?: string | { notAdmin?: true };
      abortStatusCode?: number;
    }
  }
}

export {};
