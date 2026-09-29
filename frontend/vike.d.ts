import type { SessionData } from 'express-session';
import type { i18n } from 'i18next';
import type { LaunchContext, Provider } from 'ltijs';
import type { Settings } from './src/lib/ToolSettings';
import type { AuthSession } from './src/utils/auth';

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
    interface Server {
      server: 'express';
    }
    interface PageContextServer {
      ltik?: string;
      provider?: Provider;
      launchContext?: LaunchContext;
      i18n?: i18n;
      session?: SessionData;
      auth?: AuthSession;
    }
    interface PageContext {
      locale?: string;
      ltik?: string;
      settings?: Settings;
      google?: GoogleSettings;
      basicAuth?: {
        user?: string;
        isAdmin?: boolean;
      };
      abortReason?: string | { notAdmin?: true };
      abortStatusCode?: number;
    }
  }
}

export { };
