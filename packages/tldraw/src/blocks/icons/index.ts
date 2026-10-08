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

const LUCIDE_SOURCE = 'Lucide, ISC License - https://lucide.dev (path data copied by hand; multi-element icons merged into one path, dots drawn as tiny circles because the renderers use butt caps)'

/** Build an icon entry from hand-copied Lucide path data. */
function lucide(name: string, path: string): Icon {
  return { name, path, source: LUCIDE_SOURCE }
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

  // ── Lucide (ISC) icons, P0.5 ─────────────────────────────────────────────
  'arrow-left': lucide('Arrow Left', 'M12 19l-7-7 7-7M19 12H5'),
  'arrow-up': lucide('Arrow Up', 'M5 12l7-7 7 7M12 19V5'),
  'arrow-down': lucide('Arrow Down', 'M12 5v14M19 12l-7 7-7-7'),
  'chevron-right': lucide('Chevron Right', 'M9 18l6-6-6-6'),
  'refresh': lucide('Refresh', 'M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8M21 3v5h-5M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16M8 16H3v5'),
  'check-circle': lucide('Check Circle', 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0zM9 12l2 2 4-4'),
  'x-circle': lucide('X Circle', 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0zM15 9l-6 6M9 9l6 6'),
  'alert-triangle': lucide('Alert Triangle', 'M21.73 18l-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3M12 9v4M12.25 17a0.25 0.25 0 1 1-0.5 0 0.25 0.25 0 0 1 0.5 0z'),
  'info': lucide('Info', 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0zM12 16v-4M12.25 8a0.25 0.25 0 1 1-0.5 0 0.25 0.25 0 0 1 0.5 0z'),
  'help-circle': lucide('Help Circle', 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0zM9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12.25 17a0.25 0.25 0 1 1-0.5 0 0.25 0.25 0 0 1 0.5 0z'),
  'plus': lucide('Plus', 'M5 12h14M12 5v14'),
  'minus': lucide('Minus', 'M5 12h14'),
  'briefcase': lucide('Briefcase', 'M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16M4 6h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-16a2 2 0 0 1-2-2v-10a2 2 0 0 1 2-2z'),
  'building': lucide('Building', 'M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18ZM6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2M10 6h4M10 10h4M10 14h4M10 18h4'),
  'chart-bar': lucide('Chart Bar', 'M3 3v18h18M18 17V9M13 17V5M8 17v-3'),
  'chart-line': lucide('Chart Line', 'M3 3v18h18M19 9l-5 5-4-4-3 3'),
  'chart-pie': lucide('Chart Pie', 'M21 12c.552 0 1.005-.449.95-.998a10 10 0 0 0-8.953-8.951c-.55-.055-.998.398-.998.95v8a1 1 0 0 0 1 1zM21.21 15.89A10 10 0 1 1 8 2.83'),
  'target': lucide('Target', 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0zM18 12a6 6 0 1 1-12 0 6 6 0 0 1 12 0zM14 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0z'),
  'trophy': lucide('Trophy', 'M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0V2Z'),
  'award': lucide('Award', 'M15.477 12.89l1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526M18 8a6 6 0 1 1-12 0 6 6 0 0 1 12 0z'),
  'dollar': lucide('Dollar', 'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6'),
  'wallet': lucide('Wallet', 'M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4'),
  'credit-card': lucide('Credit Card', 'M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-16a2 2 0 0 1-2-2v-10a2 2 0 0 1 2-2zM2 10h20'),
  'shopping-cart': lucide('Shopping Cart', 'M9 21a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM20 21a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12'),
  'handshake': lucide('Handshake', 'M11 17l2 2a1 1 0 1 0 3-3M14 14l2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4M21 3l1 11h-2M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3M3 4h8'),
  'rocket': lucide('Rocket', 'M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09zM12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2zM9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5'),
  'flag': lucide('Flag', 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7'),
  'gauge': lucide('Gauge', 'M12 14l4-4M3.34 19a10 10 0 1 1 17.32 0'),
  'user': lucide('User', 'M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z'),
  'user-plus': lucide('User Plus', 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM19 8v6M22 11h-6'),
  'heart': lucide('Heart', 'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z'),
  'smile': lucide('Smile', 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0zM8 14s1.5 2 4 2 4-2 4-2M9.25 9a0.25 0.25 0 1 1-0.5 0 0.25 0.25 0 0 1 0.5 0zM15.25 9a0.25 0.25 0 1 1-0.5 0 0.25 0.25 0 0 1 0.5 0z'),
  'message': lucide('Message', 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'),
  'mail': lucide('Mail', 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-16a2 2 0 0 1-2-2v-12a2 2 0 0 1 2-2zM22 7l-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7'),
  'phone': lucide('Phone', 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z'),
  'cpu': lucide('CPU', 'M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-12a2 2 0 0 1-2-2v-12a2 2 0 0 1 2-2zM10 9h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1zM15 2v2M15 20v2M2 15h2M2 9h2M20 15h2M20 9h2M9 2v2M9 20v2'),
  'database': lucide('Database', 'M21 5a9 3 0 1 1-18 0 9 3 0 0 1 18 0zM3 5v14a9 3 0 0 0 18 0V5M3 12a9 3 0 0 0 18 0'),
  'server': lucide('Server', 'M4 2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-16a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2zM4 14h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-16a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2zM6.25 6a0.25 0.25 0 1 1-0.5 0 0.25 0.25 0 0 1 0.5 0zM6.25 18a0.25 0.25 0 1 1-0.5 0 0.25 0.25 0 0 1 0.5 0z'),
  'cloud': lucide('Cloud', 'M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z'),
  'code': lucide('Code', 'M16 18l6-6-6-6M8 6l-6 6 6 6'),
  'terminal': lucide('Terminal', 'M4 17l6-6-6-6M12 19h8'),
  'lock': lucide('Lock', 'M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-14a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2zM7 11V7a5 5 0 0 1 10 0v4'),
  'key': lucide('Key', 'M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4'),
  'wifi': lucide('Wi-Fi', 'M12.25 20a0.25 0.25 0 1 1-0.5 0 0.25 0.25 0 0 1 0.5 0zM2 8.82a15 15 0 0 1 20 0M5 12.859a10 10 0 0 1 14 0M8.5 16.429a5 5 0 0 1 7 0'),
  'smartphone': lucide('Smartphone', 'M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2h-10a2 2 0 0 1-2-2v-16a2 2 0 0 1 2-2zM12.25 18a0.25 0.25 0 1 1-0.5 0 0.25 0.25 0 0 1 0.5 0z'),
  'laptop': lucide('Laptop', 'M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45L4 16'),
  'settings': lucide('Settings', 'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2zM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z'),
  'layers': lucide('Layers', 'M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83ZM22 17.65l-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65M22 12.65l-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65'),
  'git-branch': lucide('Git Branch', 'M6 3v12M21 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM18 9a9 9 0 0 1-9 9'),
  'bug': lucide('Bug', 'M8 2l1.88 1.88M14.12 3.88 16 2M9 7.13v-1a3.003 3.003 0 1 1 6 0v1M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6M12 20v-9M6.53 9C4.6 8.8 3 7.1 3 5M6 13H2M3 21c0-2.1 1.7-3.9 3.8-4M20.97 5c0 2.1-1.6 3.8-3.5 4M22 13h-4M17.2 17c2.1.1 3.8 1.9 3.8 4'),
  'book': lucide('Book', 'M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20'),
  'book-open': lucide('Book Open', 'M12 7v14M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z'),
  'graduation-cap': lucide('Graduation Cap', 'M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0zM22 10v6M6 12.5V16a6 3 0 0 0 12 0v-3.5'),
  'lightbulb': lucide('Lightbulb', 'M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5M9 18h6M10 22h4'),
  'pencil': lucide('Pencil', 'M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497zM15 5l4 4'),
  'clipboard': lucide('Clipboard', 'M9 2h6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1zM16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2'),
  'file-text': lucide('File Text', 'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7ZM14 2v4a2 2 0 0 0 2 2h4M10 9H8M16 13H8M16 17H8'),
  'library': lucide('Library', 'M16 6l4 14M12 6v14M8 8v12M4 4v16'),
  'brain': lucide('Brain', 'M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18ZM12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18ZM15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4M17.599 6.5a3 3 0 0 0 .399-1.375M6.003 5.125A3 3 0 0 0 6.401 6.5M3.477 10.896a4 4 0 0 1 .585-.396M19.938 10.5a4 4 0 0 1 .585.396M6 18a4 4 0 0 1-1.967-.516M19.967 17.484A4 4 0 0 1 18 18'),
  'puzzle': lucide('Puzzle', 'M15.39 4.39a1 1 0 0 0 1.68-.474 2.5 2.5 0 1 1 3.014 3.015 1 1 0 0 0-.474 1.68l1.683 1.682a2.414 2.414 0 0 1 0 3.414L19.61 15.39a1 1 0 0 1-1.68-.474 2.5 2.5 0 1 0-3.014 3.015 1 1 0 0 1 .474 1.68l-1.683 1.682a2.414 2.414 0 0 1-3.414 0L8.61 19.61a1 1 0 0 0-1.68.474 2.5 2.5 0 1 1-3.014-3.015 1 1 0 0 0 .474-1.68l-1.683-1.682a2.414 2.414 0 0 1 0-3.414L4.39 8.61a1 1 0 0 1 1.68.474 2.5 2.5 0 1 0 3.014-3.015 1 1 0 0 1-.474-1.68l1.683-1.682a2.414 2.414 0 0 1 3.414 0z'),
  'calendar': lucide('Calendar', 'M8 2v4M16 2v4M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-14a2 2 0 0 1-2-2v-14a2 2 0 0 1 2-2zM3 10h18'),
  'hourglass': lucide('Hourglass', 'M5 22h14M5 2h14M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2'),
  'map-pin': lucide('Map Pin', 'M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0z'),
  'home': lucide('Home', 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10'),
  'star': lucide('Star', 'M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z'),
  'sparkles': lucide('Sparkles', 'M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0zM20 3v4M22 5h-4M4 17v2M5 18H3'),
  'leaf': lucide('Leaf', 'M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10ZM2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12'),
  'sun': lucide('Sun', 'M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41'),
  'eye': lucide('Eye', 'M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z'),
  'search': lucide('Search', 'M21 21l-4.3-4.3M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0z'),
  'filter': lucide('Filter', 'M22 3H2l8 9.46V19l4 2v-8.54z'),
  'link': lucide('Link', 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71'),
  'download': lucide('Download', 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3'),
  'share': lucide('Share', 'M21 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM9 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM21 19a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98'),
  'image': lucide('Image', 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-14a2 2 0 0 1-2-2v-14a2 2 0 0 1 2-2zM11 9a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM21 15l-3.086-3.086a2 2 0 0 0-2.828 0L6 21'),
  'video': lucide('Video', 'M16 13l5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5M4 6h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-10a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2z'),
  'mic': lucide('Mic', 'M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3ZM19 10v2a7 7 0 0 1-14 0v-2M12 19v3'),
}

/**
 * Icon names grouped for pickers (inspector, gallery). Every icon in `ICONS` is in exactly one group.
 */
export const ICON_GROUPS: Record<string, string[]> = {
  'arrows-status': ['arrow-right', 'check', 'alert', 'trending-up', 'trending-down', 'arrow-left', 'arrow-up', 'arrow-down', 'chevron-right', 'refresh', 'check-circle', 'x-circle', 'alert-triangle', 'info', 'help-circle', 'plus', 'minus'],
  'business': ['briefcase', 'building', 'chart-bar', 'chart-line', 'chart-pie', 'target', 'trophy', 'award', 'dollar', 'wallet', 'credit-card', 'shopping-cart', 'handshake', 'rocket', 'flag', 'gauge'],
  'people': ['users', 'user', 'user-plus', 'heart', 'smile', 'message', 'mail', 'phone'],
  'tech': ['shield', 'cpu', 'database', 'server', 'cloud', 'code', 'terminal', 'lock', 'key', 'wifi', 'smartphone', 'laptop', 'settings', 'layers', 'git-branch', 'bug'],
  'education': ['book', 'book-open', 'graduation-cap', 'lightbulb', 'pencil', 'clipboard', 'file-text', 'library', 'brain', 'puzzle'],
  'time-place': ['clock', 'globe', 'calendar', 'hourglass', 'map-pin', 'home'],
  'misc': ['zap', 'star', 'sparkles', 'leaf', 'sun', 'eye', 'search', 'filter', 'link', 'download', 'share', 'image', 'video', 'mic'],
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