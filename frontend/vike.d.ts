import type { SessionData } from "express-session";
import type { i18n, TFunction } from "i18next";
import type { IdToken } from "./src/server/model/lti";
import type { Settings } from "./src/lib/ToolSettings";

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
      token?: IdToken
      session?: SessionData;
      writing_task_id?: string;
      settings?: Settings;
    }
    interface PageContext {
      locale?: string;
      settings?: Settings;
      google?: GoogleSettings;
      user?: string;
    }
  }
}

export {};
