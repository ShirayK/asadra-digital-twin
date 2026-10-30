'use client';

import type { Locale } from '@/i18n';
import { getDictionary } from '@/i18n';

interface TwinToolbarProps {
  locale: Locale;
  dir?: 'ltr' | 'rtl';
  showFlow: boolean;
  showSeparation: boolean;
  issueCount: number;
  onToggleFlow: () => void;
  onToggleSeparation: () => void;
}

/**
 * Toolbar with toggles for flow arrows and separation-check overlay.
 * Separation toggle shows an issues count badge when issues exist.
 */
export default function TwinToolbar({
  locale,
  dir = 'ltr',
  showFlow,
  showSeparation,
  issueCount,
  onToggleFlow,
  onToggleSeparation,
}: TwinToolbarProps) {
  const t = getDictionary(locale);

  return (
    <div
      role="toolbar"
      aria-label={t.twin.title}
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.5rem',
        alignItems: 'center',
        direction: dir,
      }}
    >
      {/* Flow toggle */}
      <button
        onClick={onToggleFlow}
        aria-pressed={showFlow}
        style={{
          padding: '0.3rem 0.9rem',
          borderRadius: '4px',
          border: '2px solid',
          borderColor: showFlow ? '#3b82d4' : '#e5e7eb',
          background: showFlow ? '#3b82d4' : '#f7f8fa',
          color: showFlow ? '#fff' : '#1f2328',
          fontWeight: 500,
          fontSize: '0.875rem',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem',
        }}
      >
        <span style={{ fontSize: '1rem' }}>→</span>
        {t.twin.toggleFlow}
      </button>

      {/* Separation check toggle + badge */}
      <button
        onClick={onToggleSeparation}
        aria-pressed={showSeparation}
        style={{
          padding: '0.3rem 0.9rem',
          borderRadius: '4px',
          border: '2px solid',
          borderColor: showSeparation ? '#ef4444' : '#e5e7eb',
          background: showSeparation ? '#fef2f2' : '#f7f8fa',
          color: showSeparation ? '#b91c1c' : '#1f2328',
          fontWeight: 500,
          fontSize: '0.875rem',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
        }}
      >
        {t.twin.toggleSeparation}
        {issueCount > 0 && (
          <span
            aria-label={`${issueCount} ${t.twin.issues}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '1.25rem',
              height: '1.25rem',
              padding: '0 0.3rem',
              borderRadius: '9999px',
              background: '#ef4444',
              color: '#fff',
              fontSize: '0.75rem',
              fontWeight: 700,
              lineHeight: 1,
            }}
          >
            {issueCount}
          </span>
        )}
      </button>
    </div>
  );
}
