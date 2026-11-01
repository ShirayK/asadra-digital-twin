'use client';

import type { Locale } from '@/i18n';
import { getDictionary } from '@/i18n';
import { brand, hygiene, stationStatus, glass, radius } from '@/theme/asadra';

interface LegendProps {
  locale: Locale;
  dir?: 'ltr' | 'rtl';
}

const SWATCH_SIZE = 11;

/**
 * Legend panel overlaid on top of the 3-D canvas.
 * Placed in the bottom corner; direction-aware for RTL Hebrew.
 * Uses brand purple glass panel with purple-derived swatches.
 */
export default function Legend({ locale, dir = 'ltr' }: LegendProps) {
  const t = getDictionary(locale);

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 12,
        ...(dir === 'rtl' ? { left: 12 } : { right: 12 }),
        background: glass.dark,
        backdropFilter: 'blur(14px)',
        border: `1px solid ${glass.darkBorder}55`,
        color: brand[100],
        fontSize: 11,
        borderRadius: radius.md,
        padding: '10px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 5,
        pointerEvents: 'none',
        direction: dir,
        minWidth: 148,
        zIndex: 10,
        boxShadow: `0 4px 24px rgba(36,18,80,0.6)`,
      }}
    >
      {/* Hygiene zone section */}
      <div
        style={{
          fontWeight: 700,
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
          color: brand[300],
          marginBottom: 2,
        }}
      >
        {t.legend.hygieneZone}
      </div>
      {(Object.entries(hygiene) as [keyof typeof hygiene, string][]).map(([key, color]) => (
        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span
            style={{
              display: 'inline-block',
              width: SWATCH_SIZE,
              height: SWATCH_SIZE,
              background: color,
              borderRadius: 2,
              flexShrink: 0,
              opacity: 0.9,
            }}
          />
          <span>{t.hygieneClass[key as keyof typeof t.hygieneClass]}</span>
        </div>
      ))}

      {/* Divider */}
      <div style={{ height: 1, background: `${brand[500]}44`, margin: '3px 0' }} />

      {/* Station status section */}
      <div
        style={{
          fontWeight: 700,
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
          color: brand[300],
          marginBottom: 2,
        }}
      >
        {t.legend.stationStatus}
      </div>
      {(Object.entries(stationStatus) as [keyof typeof stationStatus, string][]).map(([key, color]) => (
        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span
            style={{
              display: 'inline-block',
              width: SWATCH_SIZE,
              height: SWATCH_SIZE,
              borderRadius: '50%',
              background: color,
              flexShrink: 0,
            }}
          />
          <span>{t.status[key as keyof typeof t.status]}</span>
        </div>
      ))}
    </div>
  );
}
