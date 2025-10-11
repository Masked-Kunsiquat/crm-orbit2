import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';

import en from '../locales/en.json';
import es from '../locales/es.json';

function getPrimaryLocale() {
  try {
    const locales = getLocales?.();
    return (locales && locales[0] && (locales[0].languageTag || locales[0].locale)) || 'en-US';
  } catch (_) {
    try {
      const Localization = require('expo-localization');
      return Localization.locale || 'en-US';
    } catch (_) {
      return 'en-US';
    }
  }
}

// Determine preferred language (e.g., 'en', 'es')
const deviceLocale = getPrimaryLocale();
const deviceLang = deviceLocale.split('-')[0];

// Initialize i18n once
if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      compatibilityJSON: 'v3',
      resources: {
        en: { translation: en },
        es: { translation: es },
      },
      lng: deviceLang,
      fallbackLng: 'en',
      interpolation: {
        escapeValue: false,
      },
      supportedLngs: ['en', 'es'],
      returnNull: false,
    })
    .catch((error) => {
      console.error('i18n initialization failed:', error);
      console.error('Attempted to initialize with language:', deviceLang);
    });
}

export default i18n;

