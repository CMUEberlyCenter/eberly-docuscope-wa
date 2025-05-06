import type { SessionData } from "express-session";
import type { i18n, TFunction } from "i18next";
import type { IdToken } from "./src/server/model/lti";

declare global {
  namespace Vike {
    interface PageContextServer {
      i18n?: i18n;
      t?: TFunction;
      token?: IdToken
      session?: SessionData;
      writing_task_id?: string;
    }
    interface PageContext {
      locale?: string;
    }
  }
}

export {};
