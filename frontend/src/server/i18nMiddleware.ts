import i18n, { type InitOptions } from 'i18next';
import { handle, LanguageDetector } from 'i18next-http-middleware';
import { parse } from 'yaml';
import enAdmin from '#public/locales/en/admin.yaml?raw';
import enDeeplink from '#public/locales/en/deeplink.yaml?raw';
import enError from '#public/locales/en/error.yaml?raw';
import enExpectations from '#public/locales/en/expectations.yaml?raw';
import enInstructions from '#public/locales/en/instructions.yaml?raw';
import enReview from '#public/locales/en/review.yaml?raw';
import enTranslation from '#public/locales/en/translation.yaml?raw';
import esAdmin from '#public/locales/es/admin.yaml?raw';
import esDeeplink from '#public/locales/es/deeplink.yaml?raw';
import esError from '#public/locales/es/error.yaml?raw';
import esExpectations from '#public/locales/es/expectations.yaml?raw';
import esInstructions from '#public/locales/es/instructions.yaml?raw';
import esReview from '#public/locales/es/review.yaml?raw';
import esTranslation from '#public/locales/es/translation.yaml?raw';

export const I18N_CONFIG = {
  fallbackLng: 'en',
  load: 'languageOnly',
  interpolation: { escapeValue: false },
  resources: {
    en: {
      translation: parse(enTranslation),
      admin: parse(enAdmin),
      deeplink: parse(enDeeplink),
      error: parse(enError),
      expectations: parse(enExpectations),
      instructions: parse(enInstructions),
      review: parse(enReview),
    },
    es: {
      translation: parse(esTranslation),
      admin: parse(esAdmin),
      deeplink: parse(esDeeplink),
      error: parse(esError),
      expectations: parse(esExpectations),
      instructions: parse(esInstructions),
      review: parse(esReview),
    },
  },
} satisfies InitOptions;

/** Middleware to add internationalization information to the request context. */
export const i18nHandler = () => {
  // Configure i18n middleware
  i18n.use(LanguageDetector).init(I18N_CONFIG);

  return handle(i18n);
};
