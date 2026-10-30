import type { Metadata } from 'next';
import { locales, defaultLocale, type Locale } from '@/i18n';
import './globals.css';

export const metadata: Metadata = {
  title: 'Asadra Digital Twin',
  description: '3-D HACCP digital twin of a food production floor',
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const locale = (locales.includes(params.locale as Locale) ? params.locale : defaultLocale) as Locale;
  const dir = locale === 'he' ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir}>
      <body>{children}</body>
    </html>
  );
}
