import type { ReactNode } from 'react'

export const metadata = {
  title: '@tlslides/tldraw — Next.js sample',
  description: 'Reference integration of @tlslides/tldraw in a Next.js 15 / React 19 app.',
}

// R0.5 item 7 / R0 addendum item 2: Inter font loading is deliberately deferred.
// The block system's advance-width table (measure.ts) is a hand-authored estimate
// for Inter, not a real per-glyph extraction. When the extraction script is built
// and a real woff2 is checked in, load it here with next/font/local so the
// measurement table and the rendered font are the same font. Until then, the
// browser falls back to the system sans-serif, which may produce slightly
// different glyph widths than the table assumes. The intrinsic-height stacking
// from R0 is correct regardless — it uses the table, not the browser's metrics.
// See: reviews/blocks/BACKLOG-enhance.md R0.5 item 7.

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  )
}
