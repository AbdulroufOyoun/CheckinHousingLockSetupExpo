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

function applyRtl(lng: string): void {
  const rtl = lng === 'ar' || lng.startsWith('ar-');
  if (I18nManager.isRTL !== rtl) {
    I18nManager.allowRTL(rtl);
    I18nManager.forceRTL(rtl);
  }
}

function syncResourceBundles(): void {
  i18n.addResourceBundle('en', 'translation', en, true, true);
  i18n.addResourceBundle('ar', 'translation', ar, true, true);
}

export async function initI18n(storedLang?: string): Promise<void> {
  const device = Localization.getLocales()[0]?.languageCode ?? 'en';
  const raw = storedLang ?? (device === 'ar' ? 'ar' : 'en');
  const lng = raw.startsWith('ar') ? 'ar' : 'en';
  applyRtl(lng);

  if (!i18n.isInitialized) {
    await i18n.use(initReactI18next).init({
      resources,
      lng,
      fallbackLng: 'en',
      supportedLngs: ['en', 'ar'],
      nonExplicitSupportedLngs: true,
      interpolation: { escapeValue: false },
      react: { useSuspense: false },
      // Avoid treating camelCase keys as nested paths.
      keySeparator: false,
      nsSeparator: false,
    });
  } else {
    // Hot reload / language switch: pick up newly added locale keys.
    syncResourceBundles();
    await i18n.changeLanguage(lng);
  }
}

export default i18n;
