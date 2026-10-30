import Link from 'next/link';
import { getDictionary, locales, defaultLocale, type Locale } from '@/i18n';

export default function HomePage({ params }: { params: { locale: string } }) {
  const locale = (locales.includes(params.locale as Locale)
    ? params.locale
    : defaultLocale) as Locale;
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

      {/* Locale switcher */}
      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
        {locales.map((l) => (
          <Link
            key={l}
            href={`/${l}`}
            style={{
              color: l === locale ? 'var(--color-accent)' : 'var(--color-muted)',
              fontWeight: l === locale ? 700 : 400,
            }}
          >
            {l === 'he' ? 'עברית' : 'English'}
          </Link>
        ))}
      </div>
    </main>
  );
}
