'use client';

import type { Locale } from '@/i18n';
import { getDictionary } from '@/i18n';

interface LegendProps {
  locale: Locale;
  dir?: 'ltr' | 'rtl';
}

const HYGIENE_COLORS: Record<string, string> = {
  RAW: '#ef4444',
  LOW_RISK: '#f59e0b',
  HIGH_CARE: '#22c55e',
  PACKAGING: '#3b82f6',
  STORAGE: '#8b5cf6',
  NON_FOOD: '#6b7280',
};

const STATUS_COLORS: Record<string, string> = {
  OK: '#22c55e',
  OUT_OF_RANGE: '#ef4444',
  STALE: '#f59e0b',
  NO_DATA: '#9ca3af',
};

const SWATCH_SIZE = 12;

/**
 * Legend panel overlaid on top of the 3-D canvas.
 * Placed in the bottom corner; direction-aware for RTL Hebrew.
 */
export default function Legend({ locale, dir = 'ltr' }: LegendProps) {
  const t = getDictionary(locale);

  const posStyle: React.CSSProperties =
    dir === 'rtl'
      ? { bottom: 12, left: 12 }
      : { bottom: 12, right: 12 };

  return (
    <div
      style={{
        position: 'absolute',
        ...posStyle,
        background: 'rgba(10,15,28,0.6)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(148,163,184,0.22)',
        color: '#f1f5f9',
        fontSize: 11,
        borderRadius: 12,
        padding: '8px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        pointerEvents: 'none',
        direction: dir,
        minWidth: 140,
        zIndex: 10,
      }}
    >
      {/* Hygiene classes */}
      <div style={{ fontWeight: 700, fontSize: 10, opacity: 0.7, marginBottom: 2 }}>
        {t.legend.hygieneZone}
      </div>
      {Object.entries(HYGIENE_COLORS).map(([key, color]) => (
        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              display: 'inline-block',
              width: SWATCH_SIZE,
              height: SWATCH_SIZE,
              background: color,
              borderRadius: 2,
              opacity: 0.85,
              flexShrink: 0,
            }}
          />
          <span>{t.hygieneClass[key as keyof typeof t.hygieneClass]}</span>
        </div>
      ))}

      <div style={{ height: 1, background: '#334155', margin: '2px 0' }} />

      {/* Station statuses */}
      <div style={{ fontWeight: 700, fontSize: 10, opacity: 0.7, marginBottom: 2 }}>
        {t.legend.stationStatus}
      </div>
      {Object.entries(STATUS_COLORS).map(([key, color]) => (
        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
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
