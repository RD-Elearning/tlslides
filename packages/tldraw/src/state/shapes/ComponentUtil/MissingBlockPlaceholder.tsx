import * as React from 'react'
import { styled } from '@stitches/react'

interface MissingBlockPlaceholderProps {
  componentId: string
}

// Rendered instead of crashing when a ComponentShape's `componentId` has no entry in the
// `components` registry passed to <Tldraw>. This is an expected, not exceptional, situation: a
// document can outlive the app that defined its blocks, and a host app can legitimately open the
// same document with a smaller registry (e.g. a viewer build that only knows a subset of
// editor-side blocks). The placeholder is intentionally plain and clearly marked so it reads as
// "this app doesn't know this block" rather than as a bug in the block itself.
export function MissingBlockPlaceholder({ componentId }: MissingBlockPlaceholderProps) {
  return (
    <PlaceholderRoot>
      <PlaceholderLabel>Unknown block</PlaceholderLabel>
      <PlaceholderId>{componentId || '(no componentId)'}</PlaceholderId>
    </PlaceholderRoot>
  )
}

const PlaceholderRoot = styled('div', {
  pointerEvents: 'none',
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 4,
  border: '2px dashed #a1a1aa',
  borderRadius: 4,
  background: 'repeating-linear-gradient(45deg, rgba(161,161,170,0.08), rgba(161,161,170,0.08) 10px, rgba(161,161,170,0.16) 10px, rgba(161,161,170,0.16) 20px)',
  color: '#71717a',
  fontFamily: 'sans-serif',
  textAlign: 'center',
  padding: 8,
  boxSizing: 'border-box',
})

const PlaceholderLabel = styled('div', {
  fontSize: 13,
  fontWeight: 600,
})

const PlaceholderId = styled('div', {
  fontSize: 11,
  fontFamily: 'monospace',
  wordBreak: 'break-all',
})
