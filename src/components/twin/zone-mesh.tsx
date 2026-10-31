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

      {/* Zone label + allergen chips */}
      <Html
        center
        position={[0, 0.5, 0]}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
        distanceFactor={12}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
            whiteSpace: 'nowrap',
          }}
        >
          <span
            style={{
              background: 'rgba(0,0,0,0.6)',
              color: '#fff',
              fontSize: '11px',
              fontWeight: 600,
              padding: '1px 6px',
              borderRadius: '3px',
            }}
          >
            {locale === 'en' && zone.nameEn ? zone.nameEn : zone.name}
          </span>
          <span
            style={{
              background: color,
              color: '#fff',
              fontSize: '9px',
              padding: '1px 5px',
              borderRadius: '3px',
              opacity: 0.9,
            }}
          >
            {t.hygieneClass[zone.hygieneClass as keyof typeof t.hygieneClass]}
          </span>
          {zone.allergenCodes.map((code) => (
            <span
              key={code}
              style={{
                background: '#dc2626',
                color: '#fff',
                fontSize: '9px',
                fontWeight: 700,
                padding: '1px 5px',
                borderRadius: '3px',
              }}
            >
              ⚠ {code}
            </span>
          ))}
        </div>
      </Html>
    </group>
  );
}
