'use client';

import { useEffect, useState } from 'react';
import type { StationDTO } from '@/app/[locale]/twin/page';
import type { Locale } from '@/i18n';
import { getDictionary } from '@/i18n';
import { verifyReadingChain, type ChainVerificationResult } from '@/domain/chain';

interface SidePanelProps {
  station: StationDTO | null;
  locale: Locale;
  dir?: 'ltr' | 'rtl';
  onClose: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  OK: '#22c55e',
  OUT_OF_RANGE: '#ef4444',
  NO_DATA: '#9ca3af',
  STALE: '#f59e0b',
};

const CONTROL_TYPE_COLORS: Record<string, string> = {
  CCP: '#dc2626',
  CP: '#d97706',
  PRP: '#2563eb',
};

/**
 * Side panel that slides in when a station is selected.
 * - Right side in LTR, left side in RTL.
 * - Shows name, controlType badge, fields with limits, last 5 readings
 *   (out-of-range values highlighted), latest correctiveAction, and
 *   a truncated hash with chain-verified badge.
 * - All strings via i18n dictionaries. Readings are read-only.
 */
// Manual fix after Bob ran out of Bobcoins: English field labels on /en
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

export default function SidePanel({ station, locale, dir = 'ltr', onClose }: SidePanelProps) {
  const t = getDictionary(locale);
  const [chainResult, setChainResult] = useState<ChainVerificationResult | null>(null);

  // Re-run chain verification whenever the selected station changes
  useEffect(() => {
    if (!station) {
      setChainResult(null);
      return;
    }
    let cancelled = false;
    verifyReadingChain(station.lastReadings).then((result) => {
      if (!cancelled) setChainResult(result);
    });
    return () => {
      cancelled = true;
    };
  }, [station]);

  if (!station) return null;

  // Positioning: fixed panel on the appropriate side
  const sideStyle: React.CSSProperties =
    dir === 'rtl'
      ? { left: 0, borderRight: '1px solid #e2e8f0' }
      : { right: 0, borderLeft: '1px solid #e2e8f0' };

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
        width: '320px',
        background: '#ffffff',
        boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
        overflowY: 'auto',
        zIndex: 50,
        direction: dir,
        ...sideStyle,
      }}
    >
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          padding: '1rem',
          borderBottom: '1px solid #e2e8f0',
          gap: '0.5rem',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2
            style={{
              margin: 0,
              fontSize: '1rem',
              fontWeight: 700,
              wordBreak: 'break-word',
              color: '#0f172a',
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
              borderRadius: '999px',
              fontSize: '0.75rem',
              fontWeight: 600,
              background: CONTROL_TYPE_COLORS[station.controlType] ?? '#64748b',
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
              borderRadius: '999px',
              fontSize: '0.75rem',
              fontWeight: 600,
              background: STATUS_COLORS[station.status] ?? '#64748b',
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
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '1.25rem',
            color: '#64748b',
            lineHeight: 1,
            padding: '0.25rem',
            flexShrink: 0,
          }}
        >
          ×
        </button>
      </div>

      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {/* ── Fields with limits ──────────────────────────────────────────────── */}
        {station.fields.length > 0 && (
          <section>
            <SectionTitle>{t.panel.limits}</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {station.fields.map((field) => (
                <div
                  key={field.key}
                  style={{
                    background: '#f8fafc',
                    borderRadius: '6px',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.8125rem',
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: '0.125rem' }}>
                    {fieldLabel(locale, field.key, field.label)}
                    {field.unit ? ` (${field.unit})` : ''}
                  </div>
                  <div style={{ color: '#64748b', fontSize: '0.75rem' }}>
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

        {/* ── Last 5 readings ──────────────────────────────────────────────────── */}
        <section>
          <SectionTitle>{t.panel.lastReadings}</SectionTitle>
          {station.lastReadings.length === 0 ? (
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.8125rem' }}>
              {t.panel.noReadings}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {station.lastReadings.map((reading) => (
                <ReadingCard locale={locale}
                  key={reading.id}
                  reading={reading}
                  fields={station.fields}
                  t={t}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── Latest corrective action ──────────────────────────────────────────── */}
        {latestCorrectiveAction && (
          <section>
            <SectionTitle>{t.panel.correctiveAction}</SectionTitle>
            <p
              style={{
                margin: 0,
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                padding: '0.625rem 0.75rem',
                fontSize: '0.8125rem',
                color: '#b91c1c',
              }}
            >
              {latestCorrectiveAction}
            </p>
          </section>
        )}

        {/* ── Hash / chain verification ──────────────────────────────────────────── */}
        {latestReading?.hash && (
          <section>
            <SectionTitle>{t.panel.hash}</SectionTitle>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.375rem',
                fontSize: '0.8125rem',
              }}
            >
              <code
                style={{
                  background: '#f1f5f9',
                  borderRadius: '4px',
                  padding: '0.25rem 0.5rem',
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  wordBreak: 'break-all',
                  color: '#334155',
                }}
              >
                {latestReading.hash.slice(0, 16)}…
              </code>

              {chainResult !== null && (
                <span
                  style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    background: chainResult.valid ? '#22c55e' : '#f59e0b',
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
        color: '#94a3b8',
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
        background: '#f8fafc',
        borderRadius: '6px',
        padding: '0.5rem 0.75rem',
        fontSize: '0.8125rem',
      }}
    >
      <div style={{ color: '#64748b', marginBottom: '0.25rem', fontSize: '0.75rem' }}>
        {t.panel.recordedAt}: {new Date(reading.recordedAt).toLocaleString()}
      </div>

      {/* Values */}
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
            <span style={{ color: '#475569' }}>
              {fieldLabel(locale, key, field?.label)}
              {field?.unit ? ` (${field.unit})` : ''}
            </span>
            <span
              style={{
                fontWeight: 600,
                color: outOfRange ? '#dc2626' : '#1e293b',
                background: outOfRange ? '#fee2e2' : 'transparent',
                padding: outOfRange ? '0 4px' : undefined,
                borderRadius: outOfRange ? '3px' : undefined,
              }}
            >
              {value}
            </span>
          </div>
        );
      })}

      {/* Corrective action on this reading */}
      {reading.correctiveAction && (
        <div
          style={{
            marginTop: '0.25rem',
            color: '#b91c1c',
            fontSize: '0.75rem',
            fontStyle: 'italic',
          }}
        >
          {reading.correctiveAction}
        </div>
      )}
    </div>
  );
}
