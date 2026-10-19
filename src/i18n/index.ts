import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager } from 'react-native';

import ar from '@/src/i18n/locales/ar.json';
import en from '@/src/i18n/locales/en.json';

const resources = {
  en: { translation: en },
  ar: { translation: ar },
};

export async function initI18n(storedLang?: string): Promise<void> {
  const device = Localization.getLocales()[0]?.languageCode ?? 'en';
  const lng = storedLang ?? (device === 'ar' ? 'ar' : 'en');
  const rtl = lng === 'ar';
  if (I18nManager.isRTL !== rtl) {
    I18nManager.allowRTL(rtl);
    I18nManager.forceRTL(rtl);
  }
  if (!i18n.isInitialized) {
    await i18n.use(initReactI18next).init({
      resources,
      lng,
      fallbackLng: 'en',
      interpolation: { escapeValue: false },
    });
  } else {
    await i18n.changeLanguage(lng);
  }
}

export default i18n;
