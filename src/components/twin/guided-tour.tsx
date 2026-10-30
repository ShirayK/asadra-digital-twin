'use client';

/**
 * Guided Tour — Prompt 9
 *
 * Two exports:
 *   1. GuidedTourCamera  — R3F component placed inside <Canvas>.
 *      Smoothly lerps the camera to the active step's position on every frame.
 *   2. GuidedTourCard (default) — HTML overlay card rendered outside the canvas
 *      showing step name, type, and "why it matters" detail.
 */

import { useEffect, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { TourStep } from '@/app/[locale]/twin/page';
import type { Locale } from '@/i18n';
import { getDictionary } from '@/i18n';

// ── Shared mutable target (module-level, safe: one canvas per page) ──────────
const tourTarget = {
  pos: new THREE.Vector3(),
  look: new THREE.Vector3(),
  active: false,
};

/** Compute a nice overhead camera position for a given floor point. */
function cameraForStep(pos: { x: number; z: number }): {
  camPos: THREE.Vector3;
  lookAt: THREE.Vector3;
} {
  return {
    camPos: new THREE.Vector3(pos.x, 14, pos.z + 12),
    lookAt: new THREE.Vector3(pos.x, 0, pos.z),
  };
}

/** Call this from outside the canvas to update the lerp target imperatively. */
export function setTourTarget(pos: { x: number; z: number } | null): void {
  if (!pos) {
    tourTarget.active = false;
    return;
  }
  const { camPos, lookAt } = cameraForStep(pos);
  tourTarget.pos.copy(camPos);
  tourTarget.look.copy(lookAt);
  tourTarget.active = true;
}

// ── GuidedTourCamera (inside Canvas) ─────────────────────────────────────────

/**
 * Placed inside <Canvas>. Reads the shared tourTarget each frame and lerps
 * the camera position toward it. When the tour is active the canvas switches
 * to frameloop="always" (handled by the parent canvas prop).
 */
export function GuidedTourCamera() {
  const { camera } = useThree();

  useFrame(() => {
    if (!tourTarget.active) return;
    camera.position.lerp(tourTarget.pos, 0.06);
    // Softly adjust the lookAt by lerping a "current look" vector
    const currentLook = new THREE.Vector3();
    camera.getWorldDirection(currentLook);
    const desiredDir = tourTarget.look.clone().sub(camera.position).normalize();
    // Blend direction
    currentLook.lerp(desiredDir, 0.06).normalize();
    camera.lookAt(camera.position.clone().add(currentLook));
  });

  return null;
}

// ── GuidedTourCard (HTML overlay, outside Canvas) ────────────────────────────

interface GuidedTourCardProps {
  steps: TourStep[];
  currentIndex: number;
  locale: Locale;
  dir: 'ltr' | 'rtl';
  onNext: () => void;
  onPrev: () => void;
  onExit: () => void;
}

/**
 * Renders the floating step card during a guided tour.
 * Positioned as a fixed overlay above the canvas container.
 */
export default function GuidedTourCard({
  steps,
  currentIndex,
  locale,
  dir,
  onNext,
  onPrev,
  onExit,
}: GuidedTourCardProps) {
  const t = getDictionary(locale);
  const step = steps[currentIndex];

  // Esc key exits the tour
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onExit();
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') onNext();
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') onPrev();
    },
    [onExit, onNext, onPrev],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  if (!step) return null;

  const isCCP = step.controlType === 'CCP' || step.type === 'CCP';
  const stepLabel = t.tour.stepOf
    .replace('{current}', String(currentIndex + 1))
    .replace('{total}', String(steps.length));

  const stepTypeDescription =
    t.tour.stepTypes[step.type as keyof typeof t.tour.stepTypes] ?? step.type;

  return (
    <div
      role="dialog"
      aria-label={step.name}
      style={{
        position: 'absolute',
        bottom: '1rem',
        // RTL: card on left, LTR: card on right
        ...(dir === 'rtl' ? { right: '1rem' } : { left: '1rem' }),
        zIndex: 20,
        background: '#0b1220ee',
        border: '1px solid #3b82d4',
        borderRadius: '10px',
        padding: '1rem 1.25rem',
        minWidth: '280px',
        maxWidth: '340px',
        color: '#e8edf5',
        direction: dir,
        boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
        backdropFilter: 'blur(6px)',
      }}
    >
      {/* Step counter */}
      <div
        style={{
          fontSize: '0.75rem',
          color: '#7ca9e8',
          marginBottom: '0.35rem',
          fontWeight: 600,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}
      >
        {stepLabel}
      </div>

      {/* Step name */}
      <div
        style={{
          fontSize: '1.05rem',
          fontWeight: 700,
          marginBottom: '0.25rem',
          color: '#fff',
        }}
      >
        {step.name}
      </div>

      {/* Type badge */}
      <div style={{ marginBottom: '0.6rem' }}>
        <span
          style={{
            display: 'inline-block',
            padding: '0.15rem 0.55rem',
            borderRadius: '4px',
            fontSize: '0.72rem',
            fontWeight: 700,
            background: isCCP ? '#ef4444' : '#3b82d4',
            color: '#fff',
          }}
        >
          {step.type}
        </span>
      </div>

      {/* Why it matters */}
      <div
        style={{
          fontSize: '0.82rem',
          color: '#b0c4de',
          marginBottom: isCCP && step.fields.length > 0 ? '0.75rem' : 0,
          lineHeight: 1.5,
        }}
      >
        <span style={{ color: '#7ca9e8', fontWeight: 600 }}>
          {t.tour.whyMatters}:{' '}
        </span>
        {stepTypeDescription}
      </div>

      {/* CCP detail: field limits, monitoring frequency, corrective action */}
      {isCCP && step.fields.length > 0 && (
        <div
          style={{
            background: 'rgba(239,68,68,0.12)',
            border: '1px solid rgba(239,68,68,0.35)',
            borderRadius: '6px',
            padding: '0.5rem 0.7rem',
            fontSize: '0.78rem',
            color: '#fca5a5',
            lineHeight: 1.6,
          }}
        >
          {step.fields.map((field) => (
            <div key={field.key}>
              {/* Limits */}
              {(field.min !== undefined || field.max !== undefined) && (
                <div>
                  <span style={{ color: '#f87171', fontWeight: 600 }}>
                    {field.label}
                    {field.unit ? ` (${field.unit})` : ''}:{' '}
                  </span>
                  {field.min !== undefined && `≥ ${field.min}`}
                  {field.min !== undefined && field.max !== undefined && ', '}
                  {field.max !== undefined && `≤ ${field.max}`}
                </div>
              )}
              {/* Monitoring frequency */}
              {field.monitoringFrequency && (
                <div>
                  <span style={{ color: '#fca5a5', fontWeight: 600 }}>
                    {t.tour.monitoringFrequency}:{' '}
                  </span>
                  {field.monitoringFrequency}
                </div>
              )}
              {/* Corrective action */}
              {field.correctiveActionText && (
                <div>
                  <span style={{ color: '#fca5a5', fontWeight: 600 }}>
                    {t.tour.correctiveAction}:{' '}
                  </span>
                  {field.correctiveActionText}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Navigation buttons */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          marginTop: '0.9rem',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <button
          onClick={onPrev}
          disabled={currentIndex === 0}
          style={navButtonStyle(currentIndex === 0)}
        >
          {dir === 'rtl' ? `← ${t.tour.next}` : `← ${t.tour.prev}`}
        </button>

        <button onClick={onExit} style={exitButtonStyle()}>
          {t.tour.exit}
        </button>

        <button
          onClick={onNext}
          disabled={currentIndex === steps.length - 1}
          style={navButtonStyle(currentIndex === steps.length - 1)}
        >
          {dir === 'rtl' ? `${t.tour.prev} →` : `${t.tour.next} →`}
        </button>
      </div>
    </div>
  );
}

function navButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: '0.3rem 0.75rem',
    borderRadius: '5px',
    border: '1px solid #3b82d4',
    background: disabled ? 'transparent' : '#1e3a5f',
    color: disabled ? '#4a6080' : '#93c5fd',
    fontWeight: 600,
    fontSize: '0.8rem',
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.4 : 1,
  };
}

function exitButtonStyle(): React.CSSProperties {
  return {
    padding: '0.3rem 0.75rem',
    borderRadius: '5px',
    border: '1px solid #57606a',
    background: 'transparent',
    color: '#94a3b8',
    fontWeight: 500,
    fontSize: '0.8rem',
    cursor: 'pointer',
  };
}
