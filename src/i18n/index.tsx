import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { en, type Locale, type Messages } from './en';
import { zh } from './zh';

export type { Locale, Messages } from './en';

const messages: Record<Locale, Messages> = { en, zh };

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: keyof Messages) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>('en');
  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key) => messages[locale][key],
    }),
    [locale],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
