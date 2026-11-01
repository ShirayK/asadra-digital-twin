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

/**
 * Color map by hygieneClass — semi-transparent.
 * PACKAGING uses a distinct purple-family shade (indigo-violet, #5b21b6)
 * so it is clearly different from STORAGE (#8b5cf6) while staying in the
 * purple family (no blue #3b82f6).
 */
const ZONE_COLORS: Record<string, string> = {
  RAW: '#ef4444',       // red
  LOW_RISK: '#f59e0b',  // amber
  HIGH_CARE: '#22c55e', // green
  PACKAGING: '#5b21b6', // deep indigo-purple (distinct from STORAGE violet)
  STORAGE: '#8b5cf6',   // lighter violet-purple
  NON_FOOD: '#6b7280',  // grey
};

/**
 * Renders one zone as a flat semi-transparent box with a readable screen-space
 * label.  No distanceFactor — label stays at a readable minimum ~12 px size
 * regardless of zoom level.
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

      {/*
       * Zone label — screen-space HTML (no distanceFactor) so it stays
       * readable at all zoom levels.  Anchored at zone centre, slightly above
       * the floor.  White text with a coloured border for contrast.
       */}
      <Html
        center
        position={[0, 0.15, 0]}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
        zIndexRange={[5, 9]}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            whiteSpace: 'nowrap',
            background: 'rgba(8,6,20,0.72)',
            border: `1px solid ${color}99`,
            color: '#ffffff',
            fontSize: '12px',
            fontWeight: 700,
            padding: '2px 9px',
            borderRadius: '999px',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            textShadow: `0 0 8px ${color}cc`,
            boxShadow: `0 0 10px ${color}44`,
          }}
          title={t.hygieneClass[zone.hygieneClass as keyof typeof t.hygieneClass]}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: 999,
              background: color,
              flexShrink: 0,
              boxShadow: `0 0 6px ${color}`,
            }}
          />
          {locale === 'en' && zone.nameEn ? zone.nameEn : zone.name}
          {zone.allergenCodes.length > 0 && (
            <span style={{ color: '#fca5a5', fontSize: '11px' }}>
              ⚠ {zone.allergenCodes.join(', ')}
            </span>
          )}
        </div>
      </Html>
    </group>
  );
}
