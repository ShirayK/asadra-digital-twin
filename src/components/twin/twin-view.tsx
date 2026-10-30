'use client';

import dynamic from 'next/dynamic';
import type { TwinDTO } from '@/app/[locale]/twin/page';
import type { Locale } from '@/i18n';
import { getDictionary } from '@/i18n';

// Load the 3-D canvas only on the client (no SSR)
const TwinCanvas = dynamic(() => import('./twin-canvas'), { ssr: false });

interface TwinViewProps {
  dto: TwinDTO;
  locale: Locale;
}

/**
 * Client component that receives the precomputed DTO from the server and
 * orchestrates the twin UI: status summary, canvas placeholder, and issues list.
 * The full 3-D scene is wired up in Prompt 5.
 */
export default function TwinView({ dto, locale }: TwinViewProps) {
  const t = getDictionary(locale);

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
        }}
      >
        {dto.stations.map((station) => (
          <span
            key={station.id}
            style={{
              padding: '0.25rem 0.75rem',
              borderRadius: '4px',
              background: statusColor(station.status),
              color: '#fff',
              fontWeight: 500,
            }}
            title={`${station.name} — ${t.status[station.status]}`}
          >
            {station.name}
          </span>
        ))}
      </div>

      {/* ── 3-D Canvas (placeholder until Prompt 5) ───────────────────── */}
      <TwinCanvas />

      {/* ── Info row: issues + chain ───────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          fontSize: '0.875rem',
          alignItems: 'center',
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
            padding: '0 1.25rem',
            fontSize: '0.875rem',
            color: '#b91c1c',
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
