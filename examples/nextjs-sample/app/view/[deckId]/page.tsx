'use client'

import { use } from 'react'
import dynamic from 'next/dynamic'

// `next/dynamic` with `ssr: false` is only legal in a Client Component, so this page carries
// 'use client'. That rules out making it `async`: an async Client Component is not supported and
// React logs "<ViewPage> is an async Client Component" plus "A component was suspended by an
// uncached promise" on every load. Next 15 hands `params` in as a Promise, and `React.use()` is
// the client-side way to unwrap one — it suspends properly instead of being awaited.
const ViewDeck = dynamic(() => import('../../../components/ViewDeck'), { ssr: false })

interface ViewPageProps {
  params: Promise<{ deckId: string }>
}

export default function ViewPage({ params }: ViewPageProps) {
  const { deckId } = use(params)
  return <ViewDeck deckId={deckId} />
}
