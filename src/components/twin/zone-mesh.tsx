'use client';

import { Html } from '@react-three/drei';
import type { Zone } from '@/domain/schema';
import type { Locale } from '@/i18n';
import { getDictionary } from '@/i18n';

interface ZoneMeshProps {
  zone: Zone;
  locale: Locale;
}

/** Height of zone boxes above the floor */
const ZONE_HEIGHT = 0.1;

/** Color map by hygieneClass — semi-transparent */
const ZONE_COLORS: Record<string, string> = {
  RAW: '#ef4444',       // red
  LOW_RISK: '#f59e0b',  // amber
  HIGH_CARE: '#22c55e', // green
  PACKAGING: '#3b82f6', // blue
  STORAGE: '#8b5cf6',   // purple
  NON_FOOD: '#6b7280',  // grey
};

/**
 * Renders one zone as a flat semi-transparent box with a label and allergen chips.
 * Coordinates: zone.x/z are zone center, width/depth in meters.
 */
export default function ZoneMesh({ zone, locale }: ZoneMeshProps) {
  const t = getDictionary(locale);
  const color = ZONE_COLORS[zone.hygieneClass] ?? '#6b7280';

  return (
    <group position={[zone.x, ZONE_HEIGHT / 2, zone.z]}>
      {/* Zone box */}
      <mesh>
        <boxGeometry args={[zone.width, ZONE_HEIGHT, zone.depth]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={0.25}
          depthWrite={false}
        />
      </mesh>

      {/* Compact zone tag on the front edge of the zone floor (kept off the equipment) */}
      <Html
        center
        position={[0, 0.1, zone.depth / 2 - 0.35]}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
        distanceFactor={16}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            whiteSpace: 'nowrap',
            background: 'rgba(8,12,24,0.55)',
            border: `1px solid ${color}88`,
            color: '#e2e8f0',
            fontSize: '10px',
            fontWeight: 600,
            padding: '1px 7px',
            borderRadius: '999px',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
          title={t.hygieneClass[zone.hygieneClass as keyof typeof t.hygieneClass]}
        >
          <span style={{ width: 6, height: 6, borderRadius: 999, background: color }} />
          {locale === 'en' && zone.nameEn ? zone.nameEn : zone.name}
          {zone.allergenCodes.length > 0 && (
            <span style={{ color: '#fca5a5' }}>⚠ {zone.allergenCodes.join(', ')}</span>
          )}
        </div>
      </Html>
    </group>
  );
}
