import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Translation imports
import en from './locales/en/index';
import ur from './locales/ur/index';

const resources = {
  en: {
    translation: en,
  },
  ur: {
    translation: ur,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: process.env.NODE_ENV === 'development',

    interpolation: {
      escapeValue: false, // React already does escaping
    },

    detection: {
      order: ['localStorage', 'cookie', 'htmlTag', 'path', 'subdomain'],
      caches: ['localStorage', 'cookie'],
    },

    react: {
      useSuspense: false,
    },

    // Namespace configuration
    ns: ['translation'],
    defaultNS: 'translation',

    // Pluralization and context
    keySeparator: '.',
    nsSeparator: ':',

    // Performance optimization
    load: 'languageOnly',
    preload: ['en', 'ur'],

    // Error handling
    missingKeyHandler: (lng, ns, key, fallbackValue) => {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`Missing translation key: ${key} for language: ${lng}`);
      }
    },
  });

export default i18n;
