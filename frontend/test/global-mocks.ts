// import { mock } from "bun:test";

import i18next from "i18next";
import { initReactI18next } from "react-i18next";

global.__APP_VERSION__ = "TEST";
global.__BUILD_DATE__ = new Date().toISOString();

i18next.use(initReactI18next).init({code: "NO_I18NEXT_INSTANCE"})
