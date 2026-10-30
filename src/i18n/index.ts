import he from './he.json';
import en from './en.json';

export type Locale = 'he' | 'en';
export const locales: Locale[] = ['he', 'en'];
export const defaultLocale: Locale = 'he';

type Messages = typeof he;

const dictionaries: Record<Locale, Messages> = { he, en };

export function getDictionary(locale: Locale): Messages {
  return dictionaries[locale] ?? dictionaries[defaultLocale];
}
