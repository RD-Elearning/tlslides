import type { ReactNode } from 'react'

import { Inter } from 'next/font/google'

// Inter is the neutral theme font for tlslides.
// Loaded from Google Fonts with subsetting for Latin Extended-A to cover
// all characters used in the demo. The advance-width table in measure.ts
// (Phase 3) provides accurate per-glyph metrics for text measurement.
const inter = Inter({
  subsets: ['latin-ext'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata = {
  title: '@tlslides/tldraw — Next.js sample',
  description: 'Reference integration of @tlslides/tldraw in a Next.js 15 / React 19 app.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" style={{ fontFamily: inter.variable }}>
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  )
}
