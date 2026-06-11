import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import tr from './locales/tr';
import en from './locales/en';

const SUPPORTED = ['tr', 'en'] as const;

function normalizeLanguage(language?: string | null) {
  if (!language) return 'tr';
  const lower = language.toLowerCase();
  if (lower.startsWith('tr')) return 'tr';
  if (lower.startsWith('en')) return 'en';
  return 'tr';
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      tr: { translation: tr },
      en: { translation: en },
    },
    fallbackLng: 'tr',
    supportedLngs: [...SUPPORTED],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
    lng: normalizeLanguage(localStorage.getItem('i18nextLng')),
    react: {
      useSuspense: false,
    },
  });

const applyDocumentLocale = () => {
  const locale = normalizeLanguage(i18n.resolvedLanguage || i18n.language);
  document.documentElement.lang = locale;
  document.documentElement.dir = 'ltr';
};

applyDocumentLocale();
i18n.on('languageChanged', applyDocumentLocale);

export { normalizeLanguage };
export default i18n;
