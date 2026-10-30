'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { TwinDTO, StationDTO } from '@/app/[locale]/twin/page';
import type { Locale } from '@/i18n';
import { getDictionary } from '@/i18n';

// Load the 3-D canvas only on the client (no SSR) — Prompt 5 implementation
const TwinCanvas = dynamic(() => import('./twin-canvas'), { ssr: false });

interface TwinViewProps {
  dto: TwinDTO;
  locale: Locale;
}

/**
 * Client component that receives the precomputed DTO from the server and
 * orchestrates the twin UI: status summary, 3-D canvas, and issues list.
 */
export default function TwinView({ dto, locale }: TwinViewProps) {
  const t = getDictionary(locale);
  const dir = locale === 'he' ? 'rtl' : 'ltr';

  const [selectedStation, setSelectedStation] = useState<StationDTO | null>(null);

  const handleStationClick = useCallback((station: StationDTO) => {
    setSelectedStation((prev) => (prev?.id === station.id ? null : station));
  }, []);

  const issueCount = dto.separationIssues.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* ── Status summary bar ─────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem',
          fontSize: '0.875rem',
          direction: dir,
        }}
      >
        {dto.stations.map((station) => (
          <button
            key={station.id}
            onClick={() => handleStationClick(station)}
            style={{
              padding: '0.25rem 0.75rem',
              borderRadius: '4px',
              background: statusColor(station.status),
              color: '#fff',
              fontWeight: 500,
              border: selectedStation?.id === station.id ? '2px solid #fff' : '2px solid transparent',
              cursor: 'pointer',
            }}
            title={`${station.name} — ${t.status[station.status]}`}
          >
            {station.name}
          </button>
        ))}
      </div>

      {/* ── 3-D Canvas ─────────────────────────────────────────────────── */}
      <TwinCanvas
        dto={dto}
        locale={locale}
        dir={dir}
        onStationClick={handleStationClick}
      />

      {/* ── Info row: issues + chain ───────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          fontSize: '0.875rem',
          alignItems: 'center',
          direction: dir,
        }}
      >
        {/* Separation issues badge */}
        <span
          style={{
            padding: '0.25rem 0.75rem',
            borderRadius: '4px',
            background: issueCount > 0 ? '#ef4444' : '#22c55e',
            color: '#fff',
            fontWeight: 600,
          }}
        >
          {issueCount > 0
            ? `${issueCount} ${t.twin.issues}`
            : t.twin.noIssues}
        </span>

        {/* Flow segment count */}
        <span style={{ color: '#57606a' }}>
          {dto.flowSegments.length} flow segments
        </span>

        {/* Chain verification */}
        <span
          style={{
            padding: '0.25rem 0.75rem',
            borderRadius: '4px',
            background: dto.chainResult.valid ? '#22c55e' : '#f59e0b',
            color: '#fff',
            fontWeight: 600,
          }}
        >
          {dto.chainResult.valid ? t.twin.chainVerified : t.twin.chainInvalid}
        </span>
      </div>

      {/* ── Separation issues list ─────────────────────────────────────── */}
      {issueCount > 0 && (
        <ul
          style={{
            margin: 0,
            padding: dir === 'rtl' ? '0 1.25rem 0 0' : '0 0 0 1.25rem',
            fontSize: '0.875rem',
            color: '#b91c1c',
            direction: dir,
          }}
        >
          {dto.separationIssues.map((issue, i) => (
            <li key={i}>
              {t.separation[issue.kind]}
              {issue.allergenCode ? ` (${issue.allergenCode})` : ''}
              {' — '}
              {issue.fromStepId} → {issue.toStepId}
            </li>
          ))}
        </ul>
      )}

      {/* ── Selected station quick-info ─────────────────────────────────── */}
      {selectedStation && (
        <div
          style={{
            padding: '0.75rem 1rem',
            background: '#f1f5f9',
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
            fontSize: '0.875rem',
            direction: dir,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong>{selectedStation.name}</strong>
            <button
              onClick={() => setSelectedStation(null)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1rem',
                color: '#64748b',
              }}
              aria-label={t.common.close}
            >
              ×
            </button>
          </div>
          <div style={{ color: '#64748b', marginTop: '0.25rem' }}>
            {t.controlType[selectedStation.controlType]} —{' '}
            <span
              style={{
                background: statusColor(selectedStation.status),
                color: '#fff',
                padding: '1px 6px',
                borderRadius: '3px',
              }}
            >
              {t.status[selectedStation.status]}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function statusColor(status: string): string {
  switch (status) {
    case 'OK':
      return '#22c55e';
    case 'OUT_OF_RANGE':
      return '#ef4444';
    case 'STALE':
      return '#f59e0b';
    case 'NO_DATA':
    default:
      return '#94a3b8';
  }
}
