'use client'

import { useEffect, useState, useMemo } from 'react'
import type { DeckSpec } from '@tlslides/tldraw'
import { DeckViewer, createGsapDriver } from '@tlslides/tldraw'
import gsap from 'gsap'
import Link from 'next/link'

interface ViewDeckProps {
  deckId: string
}

export default function ViewDeck({ deckId }: ViewDeckProps) {
  const [spec, setSpec] = useState<DeckSpec | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDeck = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/decks/${deckId}`)
        if (!response.ok) {
          throw new Error('Failed to load deck')
        }
        const data = (await response.json()) as DeckSpec
        setSpec(data)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        setSpec(null)
      } finally {
        setLoading(false)
      }
    }

    fetchDeck()
  }, [deckId])

  // R3: Create GSAP-backed driver once; pass raw instance for BlockMotionRuntime.gsap
  const gsapDriver = useMemo(() => createGsapDriver(gsap as any), [])

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100vw',
          height: '100vh',
          backgroundColor: '#1a1a1a',
          color: '#fff',
          fontSize: '18px',
        }}
      >
        Loading…
      </div>
    )
  }

  if (error || !spec) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100vw',
          height: '100vh',
          backgroundColor: '#1a1a1a',
          color: '#f5222d',
          fontSize: '16px',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        <div>Error: {error || 'Failed to load deck'}</div>
        <Link href="/" style={{ color: '#0066cc', textDecoration: 'underline' }}>
          Back to home
        </Link>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <div style={{ width: '100%', height: '100%' }}>
        <DeckViewer
          spec={spec}
          driver={gsapDriver}
          gsap={gsap}
          className="deck-viewer"
        />
      </div>
      <div
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          color: '#fff',
          padding: '12px 16px',
          borderRadius: '4px',
          fontSize: '12px',
          zIndex: 10,
          maxWidth: '200px',
        }}
      >
        <div style={{ marginBottom: '8px' }}>
          <strong>{spec.title}</strong>
        </div>
        <Link
          href={`/edit/${deckId}`}
          style={{
            color: '#0066cc',
            textDecoration: 'none',
            fontSize: '11px',
            opacity: 0.7,
          }}
        >
          Edit deck
        </Link>
      </div>
    </div>
  )
}
