import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { translations } from './translations.js';

// Very small i18n layer. The `t()` function takes the English source string
// and returns the translated version (or the source itself when we don't
// have a Russian translation yet, so nothing ever renders blank).
//
// Usage:
//   const t = useT();
//   <button>{t('Rent equipment')}</button>
const STORAGE_KEY = 'agrental:lang';
const DEFAULT_LANG = 'en';

const I18nContext = createContext({
  lang: DEFAULT_LANG,
  setLang: () => {},
  t: (s) => s,
});

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_LANG;
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG;
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* ignore */ }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  const value = useMemo(() => {
    const dict = translations[lang] || {};
    const t = (s, fallback) => {
      if (lang === 'en') return s;
      if (s in dict) return dict[s];
      return fallback ?? s;
    };
    return { lang, setLang: setLangState, t };
  }, [lang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}

export function useT() {
  return useContext(I18nContext).t;
}
