'use client';

import type { Locale } from '@/i18n';
import { getDictionary } from '@/i18n';

interface TwinToolbarProps {
  locale: Locale;
  dir?: 'ltr' | 'rtl';
  showFlow: boolean;
  showSeparation: boolean;
  issueCount: number;
  editMode: boolean;
  liveMode: boolean;
  onToggleFlow: () => void;
  onToggleSeparation: () => void;
  onToggleEdit: () => void;
  onToggleLive: () => void;
  onReset: () => void;
  onExport: () => void;
  onImport: () => void;
}

/**
 * Toolbar with toggles for flow, separation check, and edit mode.
 * Edit mode also exposes Reset, Export, and Import buttons.
 */
export default function TwinToolbar({
  locale,
  dir = 'ltr',
  showFlow,
  showSeparation,
  issueCount,
  editMode,
  liveMode,
  onToggleFlow,
  onToggleSeparation,
  onToggleEdit,
  onToggleLive,
  onReset,
  onExport,
  onImport,
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
        style={toggleStyle(showFlow, '#3b82d4')}
      >
        <span style={{ fontSize: '1rem' }}>→</span>
        {t.twin.toggleFlow}
      </button>

      {/* Separation check toggle + badge */}
      <button
        onClick={onToggleSeparation}
        aria-pressed={showSeparation}
        style={toggleStyle(showSeparation, '#ef4444', '#fef2f2', '#b91c1c')}
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

      {/* Live / Pause toggle */}
      <button
        onClick={onToggleLive}
        aria-pressed={liveMode}
        style={toggleStyle(liveMode, '#22c55e', '#f0fdf4', '#166534')}
      >
        <span style={{ fontSize: '0.8rem' }}>{liveMode ? '⏸' : '▶'}</span>
        {locale === 'he' ? (liveMode ? 'חי' : 'מושהה') : liveMode ? 'Live' : 'Paused'}
      </button>

      {/* Separator */}
      <span style={{ width: '1px', height: '1.5rem', background: 'rgba(148,163,184,0.3)', margin: '0 0.25rem' }} />

      {/* Edit mode toggle */}
      <button
        onClick={onToggleEdit}
        aria-pressed={editMode}
        style={toggleStyle(editMode, '#7c5cd8')}
      >
        ✏ {t.twin.editMode}
      </button>

      {/* Edit mode action buttons */}
      {editMode && (
        <>
          <button onClick={onReset} style={actionStyle('#f59e0b')}>
            ↺ {t.common.reset}
          </button>
          <button onClick={onExport} style={actionStyle('#22c55e')}>
            ↓ {t.common.export}
          </button>
          <label style={{ ...actionStyle('#3b82d4'), cursor: 'pointer' }}>
            ↑ {t.common.import}
            <input
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    onImport();
                    // The actual content is handled by twin-view via onImport receiving the text
                    // We dispatch a custom event to pass the file content
                    const event = new CustomEvent('twin-import', { detail: ev.target?.result });
                    window.dispatchEvent(event);
                  };
                  reader.readAsText(file);
                }
                // Reset input so same file can be reimported
                e.target.value = '';
              }}
            />
          </label>
        </>
      )}
    </div>
  );
}

const GLASS_BASE: React.CSSProperties = {
  padding: '0.4rem 0.95rem',
  borderRadius: '999px',
  border: '1px solid rgba(148,163,184,0.25)',
  background: 'rgba(15,23,42,0.55)',
  backdropFilter: 'blur(10px)',
  color: '#cbd5e1',
  fontWeight: 600,
  fontSize: '0.85rem',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '0.4rem',
  letterSpacing: '0.01em',
};

function toggleStyle(active: boolean, activeColor: string, _bg?: string, _text?: string): React.CSSProperties {
  return active
    ? {
        ...GLASS_BASE,
        border: `1px solid ${activeColor}`,
        background: `${activeColor}26`,
        color: '#f8fafc',
        boxShadow: `0 0 14px ${activeColor}66, inset 0 0 8px ${activeColor}33`,
      }
    : GLASS_BASE;
}

function actionStyle(color: string): React.CSSProperties {
  return { ...GLASS_BASE, border: `1px solid ${color}`, color: '#e2e8f0' };
}
