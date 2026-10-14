import type { ReactNode } from 'react'

import { Inter } from 'next/font/google'
// AC3 — the deck-style fonts (reviews/blocks/ai-curation/README.md §3.3, §4.1): self-hosted,
// versioned fontsource packages, all OFL-1.1 with a Vietnamese subset. The package only names
// families (`DeckStyle.fonts`, theme `headingFamily`/`bodyFamily`); the host loads them. Each
// family's widths are measured by tools/layout-report/calibrate/font-widths.js from these files.
import '@fontsource-variable/archivo'
import '@fontsource-variable/bricolage-grotesque'
import '@fontsource-variable/crimson-pro'
import '@fontsource-variable/fraunces'
import '@fontsource-variable/nunito'
import '@fontsource-variable/playfair-display'
import '@fontsource-variable/plus-jakarta-sans'
import '@fontsource-variable/source-code-pro'
import '@fontsource-variable/source-serif-4'
import '@fontsource/be-vietnam-pro/400.css'
import '@fontsource/be-vietnam-pro/700.css'
import '@fontsource/patrick-hand/400.css'

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
