import type { ReactNode } from 'react'

export const metadata = {
  title: '@tlslides/tldraw — Next.js sample',
  description: 'Reference integration of @tlslides/tldraw in a Next.js 15 / React 19 app.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  )
}
