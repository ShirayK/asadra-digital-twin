import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getDictionary, locales, defaultLocale, type Locale } from '@/i18n';

export default function HomePage({ params }: { params: { locale: string } }) {
  const locale = (locales.includes(params.locale as Locale)
    ? params.locale
    : defaultLocale) as Locale;

  // Any non-English locale hits this page — redirect to /en/twin
  if (locale !== 'en') {
    redirect('/en/twin');
  }

  const t = getDictionary(locale);

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1.5rem',
        padding: '2rem',
        textAlign: 'center',
      }}
    >
      <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>{t.home.headline}</h1>
      <p style={{ color: 'var(--color-muted)', maxWidth: '480px' }}>{t.home.subheadline}</p>
      <Link
        href={`/${locale}/twin`}
        style={{
          display: 'inline-block',
          padding: '0.75rem 2rem',
          background: 'var(--color-accent)',
          color: '#fff',
          borderRadius: '6px',
          fontWeight: 600,
        }}
      >
        {t.home.cta}
      </Link>
    </main>
  );
}
