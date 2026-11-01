'use client';

import type { Locale } from '@/i18n';
import { getDictionary } from '@/i18n';
import { brand, status, glass, radius } from '@/theme/asadra';

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
  onFitView?: () => void;
  onTopView?: () => void;
}

/**
 * Toolbar with toggles for flow, separation check, edit mode, camera controls.
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
  onFitView,
  onTopView,
}: TwinToolbarProps) {
  const t = getDictionary(locale);

  return (
    <div
      role="toolbar"
      aria-label={t.twin.title}
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.4rem',
        alignItems: 'center',
        direction: dir,
      }}
    >
      {/* Flow toggle */}
      <button
        onClick={onToggleFlow}
        aria-pressed={showFlow}
        style={toggleStyle(showFlow, brand[500])}
      >
        <span style={{ fontSize: '1rem' }}>→</span>
        {t.twin.toggleFlow}
      </button>

      {/* Separation check toggle + badge */}
      <button
        onClick={onToggleSeparation}
        aria-pressed={showSeparation}
        style={toggleStyle(showSeparation, status.deviation)}
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
              borderRadius: radius.pill,
              background: status.deviation,
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
        style={toggleStyle(liveMode, status.ok)}
      >
        <span style={{ fontSize: '0.8rem' }}>{liveMode ? '⏸' : '▶'}</span>
        {locale === 'he' ? (liveMode ? 'חי' : 'מושהה') : liveMode ? 'Live' : 'Paused'}
      </button>

      {/* Separator */}
      <Divider />

      {/* Edit mode toggle */}
      <button
        onClick={onToggleEdit}
        aria-pressed={editMode}
        style={toggleStyle(editMode, brand[400])}
      >
        ✏ {t.twin.editMode}
      </button>

      {/* Edit mode action buttons */}
      {editMode && (
        <>
          <button onClick={onReset} style={actionStyle(status.expiring)}>
            ↺ {t.common.reset}
          </button>
          <button onClick={onExport} style={actionStyle(status.ok)}>
            ↓ {t.common.export}
          </button>
          <label style={{ ...actionStyle(brand[500]), cursor: 'pointer' }}>
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
                    const event = new CustomEvent('twin-import', { detail: ev.target?.result });
                    window.dispatchEvent(event);
                  };
                  reader.readAsText(file);
                }
                e.target.value = '';
              }}
            />
          </label>
        </>
      )}

      {/* Separator */}
      <Divider />

      {/* Camera buttons */}
      {onFitView && (
        <button
          onClick={onFitView}
          title={`${t.twin.fitView} (F)`}
          style={actionStyle(brand[400])}
        >
          ⊡ {t.twin.fitView}
        </button>
      )}
      {onTopView && (
        <button
          onClick={onTopView}
          title={t.twin.topView}
          style={actionStyle(brand[300])}
        >
          ↓ {t.twin.topView}
        </button>
      )}
    </div>
  );
}

function Divider() {
  return (
    <span
      style={{
        width: '1px',
        height: '1.5rem',
        background: `${brand[400]}44`,
        margin: '0 0.15rem',
        flexShrink: 0,
      }}
    />
  );
}

const GLASS_BASE: React.CSSProperties = {
  padding: '0.38rem 0.9rem',
  borderRadius: radius.pill,
  border: `1px solid ${brand[400]}44`,
  background: glass.panel,
  backdropFilter: 'blur(10px)',
  color: brand[100],
  fontWeight: 600,
  fontSize: '0.85rem',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '0.4rem',
  letterSpacing: '0.01em',
  transition: 'background 0.15s, border-color 0.15s, box-shadow 0.15s',
};

function toggleStyle(active: boolean, activeColor: string): React.CSSProperties {
  return active
    ? {
        ...GLASS_BASE,
        border: `1px solid ${activeColor}`,
        background: `${activeColor}26`,
        color: '#fff',
        boxShadow: `0 0 12px ${activeColor}55, inset 0 0 6px ${activeColor}22`,
      }
    : GLASS_BASE;
}

function actionStyle(color: string): React.CSSProperties {
  return {
    ...GLASS_BASE,
    border: `1px solid ${color}66`,
    color: brand[100],
  };
}
