import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import Backend from "i18next-http-backend";
import { FC, ReactNode, use } from "react";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { parse } from "yaml";

i18n
  .use(Backend) // get from public/locales/...
  .use(LanguageDetector) // get language from browser
  .use(initReactI18next)
  .init({
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    backend: {
      loadPath: "/locales/{{lng}}/{{ns}}.yaml",
      parse: (data: string) => parse(data),
    },
    showSupportNotice: false,
  });

const translate = i18n.loadNamespaces("translation");

export const I18Next: FC<{ children: ReactNode }> = ({ children }) => {
  use(translate);
  return (
    <I18nextProvider i18n={i18n} defaultNS={"translation"}>
      {children}
    </I18nextProvider>
  );
};
