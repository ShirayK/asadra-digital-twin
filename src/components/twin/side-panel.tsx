'use client';

import { useEffect, useState } from 'react';
import type { StationDTO } from '@/app/[locale]/twin/page';
import type { Locale } from '@/i18n';
import { getDictionary } from '@/i18n';
import { verifyReadingChain, type ChainVerificationResult } from '@/domain/chain';
import { brand, stationStatus as statusColors, glass, radius, status } from '@/theme/asadra';

interface SidePanelProps {
  station: StationDTO | null;
  locale: Locale;
  dir?: 'ltr' | 'rtl';
  onClose: () => void;
}

const CONTROL_TYPE_COLORS: Record<string, string> = {
  CCP: status.deviation,
  CP: status.expiring,
  PRP: brand[500],
};

// Manual fix: English field labels on /en
const FIELD_LABEL_EN: Record<string, string> = {
  temp: 'Temperature',
  duration_h: 'Soak time',
  test_passed: 'Test passed',
  seal_ok: 'Seal OK',
};
function fieldLabel(locale: string, key: string, label?: string): string {
  if (locale === 'en' && FIELD_LABEL_EN[key]) return FIELD_LABEL_EN[key];
  return label ?? key;
}

/**
 * Side panel that slides in when a station is selected.
 * - Fixed 340 px, right side in LTR / left in RTL.
 * - Max-height calc(100vh - 96px), overflow-y auto.
 * - Logical properties throughout for RTL/LTR correctness.
 * - Word-break and overflow-wrap anywhere; line-height 1.45.
 * - Brand purple glass background.
 */
export default function SidePanel({ station, locale, dir = 'ltr', onClose }: SidePanelProps) {
  const t = getDictionary(locale);
  const [chainResult, setChainResult] = useState<ChainVerificationResult | null>(null);

  useEffect(() => {
    if (!station) {
      setChainResult(null);
      return;
    }
    let cancelled = false;
    verifyReadingChain(station.lastReadings).then((result) => {
      if (!cancelled) setChainResult(result);
    });
    return () => { cancelled = true; };
  }, [station]);

  if (!station) return null;

  const latestReading = station.lastReadings[0] ?? null;
  const latestCorrectiveAction = latestReading?.correctiveAction ?? null;

  return (
    <div
      role="complementary"
      aria-label={locale === 'en' && station.nameEn ? station.nameEn : station.name}
      style={{
        position: 'fixed',
        top: 0,
        bottom: 0,
        // Logical properties handle RTL/LTR automatically
        ...(dir === 'rtl' ? { insetInlineStart: 0 } : { insetInlineEnd: 0 }),
        width: '340px',
        maxHeight: 'calc(100vh - 96px)',
        // Vertically center when content is shorter than max-height
        marginBlock: 'auto',
        background: glass.dark,
        backdropFilter: 'blur(18px)',
        color: '#fff',
        borderInline: `1px solid ${glass.darkBorder}55`,
        boxShadow: `0 0 48px rgba(36,18,80,0.7)`,
        overflowY: 'auto',
        zIndex: 50,
        direction: dir,
        borderRadius: dir === 'rtl' ? `0 ${radius.lg} ${radius.lg} 0` : `${radius.lg} 0 0 ${radius.lg}`,
        // Typography defaults for this panel
        lineHeight: 1.45,
        wordBreak: 'break-word',
        overflowWrap: 'anywhere',
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          padding: '1rem',
          borderBottom: `1px solid ${brand[500]}44`,
          gap: '0.5rem',
          background: `${brand[700]}55`,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2
            style={{
              margin: 0,
              fontSize: '1rem',
              fontWeight: 700,
              color: '#fff',
              wordBreak: 'break-word',
              overflowWrap: 'anywhere',
            }}
          >
            {locale === 'en' && station.nameEn ? station.nameEn : station.name}
          </h2>

          {/* Control type badge */}
          <span
            style={{
              display: 'inline-block',
              marginTop: '0.375rem',
              padding: '2px 8px',
              borderRadius: radius.pill,
              fontSize: '0.75rem',
              fontWeight: 600,
              background: CONTROL_TYPE_COLORS[station.controlType] ?? brand[500],
              color: '#fff',
            }}
          >
            {t.controlType[station.controlType]}
          </span>

          {/* Status badge */}
          <span
            style={{
              display: 'inline-block',
              marginTop: '0.375rem',
              marginInlineStart: '0.375rem',
              padding: '2px 8px',
              borderRadius: radius.pill,
              fontSize: '0.75rem',
              fontWeight: 600,
              background: statusColors[station.status as keyof typeof statusColors] ?? brand[400],
              color: '#fff',
            }}
          >
            {t.status[station.status]}
          </span>
        </div>

        <button
          onClick={onClose}
          aria-label={t.common.close}
          style={{
            background: `${brand[500]}33`,
            border: `1px solid ${brand[400]}55`,
            borderRadius: radius.sm,
            cursor: 'pointer',
            fontSize: '1.25rem',
            color: brand[300],
            lineHeight: 1,
            padding: '0.25rem 0.45rem',
            flexShrink: 0,
            transition: 'background 0.15s',
          }}
        >
          ×
        </button>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {/* Fields with limits */}
        {station.fields.length > 0 && (
          <section>
            <SectionTitle>{t.panel.limits}</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {station.fields.map((field) => (
                <div
                  key={field.key}
                  style={{
                    background: glass.card,
                    border: `1px solid ${glass.cardBorder}`,
                    borderRadius: radius.sm,
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.8125rem',
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: '0.125rem', color: brand[100] }}>
                    {fieldLabel(locale, field.key, field.label)}
                    {field.unit ? ` (${field.unit})` : ''}
                  </div>
                  <div style={{ color: brand[300], fontSize: '0.75rem' }}>
                    {field.min !== undefined && (
                      <span>
                        {t.panel.min}: {field.min}
                        {'  '}
                      </span>
                    )}
                    {field.max !== undefined && (
                      <span>
                        {t.panel.max}: {field.max}
                      </span>
                    )}
                    {field.min === undefined && field.max === undefined && '—'}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Last 5 readings */}
        <section>
          <SectionTitle>{t.panel.lastReadings}</SectionTitle>
          {station.lastReadings.length === 0 ? (
            <p style={{ margin: 0, color: brand[300], fontSize: '0.8125rem' }}>
              {t.panel.noReadings}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {station.lastReadings.map((reading) => (
                <ReadingCard
                  locale={locale}
                  key={reading.id}
                  reading={reading}
                  fields={station.fields}
                  t={t}
                />
              ))}
            </div>
          )}
        </section>

        {/* Latest corrective action */}
        {latestCorrectiveAction && (
          <section>
            <SectionTitle>{t.panel.correctiveAction}</SectionTitle>
            <p
              style={{
                margin: 0,
                background: `rgba(120,20,20,0.35)`,
                border: `1px solid ${status.deviation}55`,
                borderRadius: radius.sm,
                padding: '0.625rem 0.75rem',
                fontSize: '0.8125rem',
                color: '#fecaca',
                wordBreak: 'break-word',
                overflowWrap: 'anywhere',
              }}
            >
              {latestCorrectiveAction}
            </p>
          </section>
        )}

        {/* Hash / chain verification */}
        {latestReading?.hash && (
          <section>
            <SectionTitle>{t.panel.hash}</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', fontSize: '0.8125rem' }}>
              <code
                style={{
                  background: glass.card,
                  borderRadius: radius.sm,
                  padding: '0.25rem 0.5rem',
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  wordBreak: 'break-all',
                  color: brand[300],
                }}
              >
                {latestReading.hash.slice(0, 16)}…
              </code>

              {chainResult !== null && (
                <span
                  style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: radius.pill,
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    background: chainResult.valid ? status.ok : status.expiring,
                    color: '#fff',
                    alignSelf: 'flex-start',
                  }}
                >
                  {chainResult.valid ? t.twin.chainVerified : t.twin.chainInvalid}
                </span>
              )}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}

/** Small section heading */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3
      style={{
        margin: '0 0 0.5rem',
        fontSize: '0.75rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: brand[300],
      }}
    >
      {children}
    </h3>
  );
}

/** One reading row — values highlighted red if out-of-range */
function ReadingCard({
  reading,
  fields,
  t,
  locale,
}: {
  locale: string;
  reading: StationDTO['lastReadings'][number];
  fields: StationDTO['fields'];
  t: ReturnType<typeof getDictionary>;
}) {
  return (
    <div
      style={{
        background: glass.card,
        border: `1px solid ${glass.cardBorder}`,
        borderRadius: radius.sm,
        padding: '0.5rem 0.75rem',
        fontSize: '0.8125rem',
      }}
    >
      <div style={{ color: brand[300], marginBottom: '0.25rem', fontSize: '0.75rem' }}>
        {t.panel.recordedAt}: {new Date(reading.recordedAt).toLocaleString()}
      </div>

      {Object.entries(reading.values).map(([key, value]) => {
        const field = fields.find((f) => f.key === key);
        const outOfRange =
          field !== undefined &&
          ((field.min !== undefined && value < field.min) ||
            (field.max !== undefined && value > field.max));

        return (
          <div
            key={key}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '1px 0',
            }}
          >
            <span style={{ color: brand[300] }}>
              {fieldLabel(locale, key, field?.label)}
              {field?.unit ? ` (${field.unit})` : ''}
            </span>
            <span
              style={{
                fontWeight: 600,
                color: outOfRange ? '#fca5a5' : '#fff',
                background: outOfRange ? 'rgba(220,38,38,0.2)' : 'transparent',
                padding: outOfRange ? '0 4px' : undefined,
                borderRadius: outOfRange ? '3px' : undefined,
              }}
            >
              {value}
            </span>
          </div>
        );
      })}

      {reading.correctiveAction && (
        <div style={{ marginTop: '0.25rem', color: '#fecaca', fontSize: '0.75rem', fontStyle: 'italic' }}>
          {reading.correctiveAction}
        </div>
      )}
    </div>
  );
}
