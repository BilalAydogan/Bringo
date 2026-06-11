import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const current = i18n.resolvedLanguage || i18n.language || 'tr';

  const selectLanguage = async (language: string) => {
    await i18n.changeLanguage(language);
  };

  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-neutral-700 bg-neutral-900/80 p-1">
      <span className="px-2 text-neutral-500">
        <Languages className="w-4 h-4" aria-hidden="true" />
      </span>
      {(['tr', 'en'] as const).map((language) => (
        <button
          key={language}
          type="button"
          onClick={() => selectLanguage(language)}
          aria-label={`${t('common.language')}: ${language.toUpperCase()}`}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
            current.startsWith(language)
              ? 'bg-amber-500 text-neutral-950'
              : 'text-neutral-300 hover:bg-neutral-800'
          }`}
        >
          {language.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
