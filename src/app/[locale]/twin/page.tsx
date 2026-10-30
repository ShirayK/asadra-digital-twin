import { getDictionary, locales, defaultLocale, type Locale } from '@/i18n';

export const dynamic = 'force-dynamic';

export default function TwinPage({ params }: { params: { locale: string } }) {
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
        gap: '1rem',
        padding: '2rem',
        textAlign: 'center',
      }}
    >
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>{t.twin.title}</h1>
      <p style={{ color: 'var(--color-muted)' }}>
        {/* 3-D canvas loads here in subsequent prompts */}
        {t.common.loading}
      </p>
    </main>
  );
}
