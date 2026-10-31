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
        {liveMode ? 'Live' : 'Paused'}
      </button>

      {/* Separator */}
      <span style={{ width: '1px', height: '1.5rem', background: '#e5e7eb', margin: '0 0.25rem' }} />

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

function toggleStyle(
  active: boolean,
  activeColor: string,
  activeBg?: string,
  activeText?: string,
): React.CSSProperties {
  return {
    padding: '0.3rem 0.9rem',
    borderRadius: '4px',
    border: '2px solid',
    borderColor: active ? activeColor : '#e5e7eb',
    background: active ? (activeBg ?? activeColor) : '#f7f8fa',
    color: active ? (activeText ?? '#fff') : '#1f2328',
    fontWeight: 500,
    fontSize: '0.875rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
  };
}

function actionStyle(color: string): React.CSSProperties {
  return {
    padding: '0.3rem 0.9rem',
    borderRadius: '4px',
    border: `2px solid ${color}`,
    background: '#f7f8fa',
    color: '#1f2328',
    fontWeight: 500,
    fontSize: '0.875rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
  };
}
