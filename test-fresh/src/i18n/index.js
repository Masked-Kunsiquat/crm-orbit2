import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getPrimaryLocale } from '../utils/dateUtils';
import { logger } from '../errors/utils/errorLogger';

import en from '../locales/en.json';
import es from '../locales/es.json';
import de from '../locales/de.json';
import fr from '../locales/fr.json';
import zhHans from '../locales/zh-Hans.json';

// Determine preferred language (e.g., 'en', 'es', 'de', 'fr', 'zh')
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
        de: { translation: de },
        fr: { translation: fr },
        zh: { translation: zhHans },
      },
      lng: deviceLang,
      fallbackLng: 'en',
      interpolation: {
        escapeValue: false,
      },
      supportedLngs: ['en', 'es', 'de', 'fr', 'zh'],
      returnNull: false,
    })
    .catch(error => {
      logger.error('i18n', 'init', error, { deviceLang });
    });
}

export default i18n;
