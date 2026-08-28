'use client'

import dynamic from 'next/dynamic'

// The editor touches `window` at module scope, so it cannot be part of the server-rendered tree.
const Editor = dynamic(() => import('../components/Editor'), { ssr: false })

export default function Page() {
  return <Editor />
}
