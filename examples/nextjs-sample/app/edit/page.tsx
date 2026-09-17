'use client'

import dynamic from 'next/dynamic'

// The editor touches `window` at module scope, so it cannot be part of the server-rendered tree.
const EditEditor = dynamic(() => import('../../components/EditEditor'), { ssr: false })

export default function EditPage() {
  return <EditEditor />
}
