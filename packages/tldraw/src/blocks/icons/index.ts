/**
 * D6 — Icon set for tlslides.
 *
 * A small set of outline SVG path data on a 24×24 viewBox.
 * Sources and licenses are documented in each icon's header.
 *
 * These icons are considered Tier-A blocks and can be used by multiple
 * composite blocks (e.g., feature-grid, steps, testimonial).
 *
 * The `icon` property is used by `tls.m.icon` and `tls.m.icon-label`.
 * The `tls.c.feature-grid` block renders the `icon` prop as the actual
 * SVG path rather than printing the icon name as text.
 *
 * To add a new icon:
 * 1. Choose an acceptable license (MIT, Apache-2.0, CC0, etc.)
 * 2. Add the SVG path data to this file with proper attribution
 * 3. Update the icon lookup in tls.m.icon/layout.ts
 * 4. Add the icon to the testimonial block if needed
 */

/**
 * Icon metadata and per-glyph path data.
 * All paths are on a normalized 24×24 viewBox.
 */
export interface Icon {
  /** SVG path data (the "d" attribute) */
  path: string
  /** Human-readable name */
  name: string
  /** Source URL and license information */
  source?: string
}

/**
 * Map of icon name → icon data for lookup.
 */
export const ICONS: Record<string, Icon> = {
  zap: {
    name: 'Zap',
    path: 'M13 3L1 9v10.56l8.5 4.11L21 9V9l-8-6zM11 10.5V17l-5.5 2.73V11l5.5-2.73v4.66l3.5-1.73L11 10.5z',
    source: 'Tabler Icons, MIT License - https://tablericons.com',
  },
  shield: {
    name: 'Shield',
    path: 'M12 2L2 7v10l10 5 10-5V7L12 2zm0 17.27L4.63 12l.29-.17 7.05-4.11 7.45 4.11zM5.33 11l6.67-3.85 6.67 3.85v6.27l-6.67 3.85L5.33 17.27v-6.27z',
    source: 'Tabler Icons, MIT License - https://tablericons.com',
  },
  globe: {
    name: 'Globe',
    path: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.54-1.9-1.54h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.87 3.97-2.32 5.42z',
    source: 'Google Material Icons, Apache-2.0 License - https://fonts.google.com/icons',
  },
  check: {
    name: 'Check',
    path: 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
    source: 'Google Material Icons, Apache-2.0 License - https://fonts.google.com/icons',
  },
  'arrow-right': {
    name: 'Arrow Right',
    path: 'M8.59 16.59L10.17 18l6-6-6-6L6.76 7.41 12.59 13z',
    source: 'Google Material Icons, Apache-2.0 License - https://fonts.google.com/icons',
  },
  'trending-up': {
    name: 'Trending Up',
    path: 'M3 3v18h18V3H3zm10.27 9.76l-3.77-3.77L14 9.31l2.72 2.72 6.55-6.55L20.19 4.7l-6.92 6.92z',
    source: 'Tabler Icons, MIT License - https://tablericons.com',
  },
  'trending-down': {
    name: 'Trending Down',
    path: 'M3 3v18h18V3H3zm10.27-1.27l-3.77 3.77L14 9.31l2.72-2.72 6.55 6.55L20.19 19.3l-6.92-6.92z',
    source: 'Tabler Icons, MIT License - https://tablericons.com',
  },
  users: {
    name: 'Users',
    path: 'M16 11v1m-2-2h2m-2 2h2m-2 2h2M9 11h6V9a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-1a2 2 0 01-2-2v-2a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 00-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h3.82a1 1 0 01.96.8L16 11z',
    source: 'Google Material Icons, Apache-2.0 License - https://fonts.google.com/icons',
  },
  clock: {
    name: 'Clock',
    path: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-2-9H11V5h2v4zm0 4H11V9h2v4z',
    source: 'Google Material Icons, Apache-2.0 License - https://fonts.google.com/icons',
  },
  alert: {
    name: 'Alert',
    path: 'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z',
    source: 'Google Material Icons, Apache-2.0 License - https://fonts.google.com/icons',
  },
}

/**
 * Look up an icon by name. Returns undefined for unknown names.
 * Unknown names should be treated as a lint finding, never rendered as text.
 */
export function getIcon(name: string): Icon | undefined {
  return ICONS[name]
}

/**
 * Check if an icon name is known.
 */
export function hasIcon(name: string): boolean {
  return name in ICONS
}

/**
 * Default/fallback icon for unknown names.
 * A warning icon (exclamation triangle).
 */
export const FALLBACK_ICON: Icon = {
  name: 'Warning',
  path: 'M10.29 3.87L5.62 18a2 2 0 001.71 3h13.16a2 2 0 001.71-3L13.71 3.87a2 2 0 00-3.42 0zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3.29l-3.3 3.3a1 1 0 101.42 1.42L11 9.41V7a1 1 0 00-1-1z',
}