import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enCommon from './locales/en/common.json';
import hiCommon from './locales/hi/common.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: enCommon
      },
      hi: {
        common: hiCommon
      }
    },
    lng: 'en',
    fallbackLng: 'en',
    ns: ['common'],
    defaultNS: 'common',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
