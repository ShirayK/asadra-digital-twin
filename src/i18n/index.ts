import he from './he.json';
import en from './en.json';

export type Locale = 'en';
export const locales: Locale[] = ['en'];
export const defaultLocale: Locale = 'en';

type Messages = typeof en;

const dictionaries: Record<string, Messages> = { en, he };

export function getDictionary(locale: string): Messages {
  return (dictionaries[locale] ?? dictionaries['en']) as Messages;
}
