import type { Preview } from '@storybook/react-vite';
// import '../pages/i18n';
import '../pages/index.scss';
/* Configuration for i18n support. */
import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';
import { initReactI18next } from 'react-i18next';
import { parse } from 'yaml';

i18n
  .use(Backend) // get from public/locales/...
  .use(LanguageDetector) // get language from browser
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.yaml',
      parse: (data: string) => parse(data),
    },
  });

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
