/**
 * Asadra brand design tokens.
 *
 * Palette: brand purple (#41228e) + white (#ffffff).
 * Tints/shades of purple provide all depth; white for text and highlights.
 * Green / amber / red are reserved exclusively for CCP status signals.
 *
 * Import these tokens instead of hard-coding hex values anywhere in the UI.
 */

// ── Brand purple scale ────────────────────────────────────────────────────────
export const brand = {
  /** Lightest tint — page-level backgrounds */
  50:  '#f4f2fb',
  /** Subtle surface tint */
  100: '#e6e1f6',
  /** Soft accent, placeholder text on light */
  300: '#aa93da',
  /** Mid accent — secondary highlights, borders */
  400: '#8765c6',
  /** Primary interactive — buttons, active states */
  500: '#6841b0',
  /** Primary brand — logo, top-bar, strong accents */
  700: '#41228e',
  /** Deep dark — panel backgrounds, dark glass */
  900: '#241250',
} as const;

// ── Pure white ────────────────────────────────────────────────────────────────
export const white = '#ffffff';

// ── Semantic status colors (CCP only — do NOT use for branding) ───────────────
export const status = {
  ok:        '#16a34a',   // green — reading within limits
  deviation: '#dc2626',   // red   — out-of-range / breach
  hold:      '#ea580c',   // orange — on hold
  expiring:  '#d97706',   // amber  — stale / near-expiry
  noData:    '#6b7280',   // gray   — no measurement
} as const;

// ── Derived aliases used most often ──────────────────────────────────────────
/** Convenience: OUT_OF_RANGE → deviation red */
export const stationStatus = {
  OK:           status.ok,
  OUT_OF_RANGE: status.deviation,
  STALE:        status.expiring,
  NO_DATA:      status.noData,
} as const;

// ── Hygiene zone palette (purple-anchored) ────────────────────────────────────
export const hygiene = {
  RAW:       status.deviation,  // red   — raw material risk
  LOW_RISK:  status.expiring,   // amber — low risk
  HIGH_CARE: status.ok,         // green — high care / clean
  PACKAGING: brand[500],        // purple 500 — packaging
  STORAGE:   brand[400],        // purple 400 — storage
  NON_FOOD:  status.noData,     // gray  — non-food
} as const;

// ── Glass panel surfaces ──────────────────────────────────────────────────────
export const glass = {
  /** Primary panel — dark purple glass */
  dark:        `rgba(36,18,80,0.88)`,
  darkBorder:  brand[500],
  /** Medium panel — sidebars, tooltips */
  panel:       `rgba(36,18,80,0.72)`,
  panelBorder: `rgba(104,65,176,0.55)`,
  /** Subtle card surface */
  card:        `rgba(65,34,142,0.28)`,
  cardBorder:  `rgba(135,101,198,0.35)`,
} as const;

// ── Ink / neutral scale (derived from brand-900 desaturated) ──────────────────
export const ink = {
  base:  '#1c1830',   // near-black — main text on light surfaces
  muted: '#6c6880',   // secondary text
  line:  '#e6e4ee',   // dividers / borders on light
  page:  '#f7f7fa',   // page background (light mode)
} as const;

// ── Typography ────────────────────────────────────────────────────────────────
export const fontFamily =
  "'Rubik', 'Heebo', system-ui, -apple-system, 'Segoe UI', sans-serif";

// ── Shared border-radius ──────────────────────────────────────────────────────
export const radius = {
  sm:   '6px',
  md:   '12px',
  lg:   '16px',
  pill: '9999px',
} as const;
