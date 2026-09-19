/**
 * Block Inserter palette component.
 *
 * R13 implementation - provides a floating palette that shows available
 * block types when the user clicks the "+" button or presses a shortcut.
 * Displays blocks grouped by family (Text, Layout, Composite, etc.)
 * with icons, names, and descriptions.
 */

import * as React from 'react'
import { styled } from '@stitches/react'
import { useBlockRegistry } from '../../hooks'
import type { BlockFamily } from '../../blocks/types'

export interface BlockInserterProps {
  /** Position of the inserter (client coordinates) */
  position: { x: number; y: number } | null
  /** Whether the inserter is visible */
  visible: boolean
  /** Called when a block type is selected */
  onSelect: (blockType: string) => void
  /** Called to close the inserter */
  onClose: () => void
}

// Family display names and icons
const FAMILY_INFO: Record<BlockFamily, { name: string; icon: string }> = {
  layout: { name: 'Layout', icon: '□' },
  text: { name: 'Text', icon: 'A' },
  data: { name: 'Data', icon: '#' },
  diagram: { name: 'Diagram', icon: '◊' },
  media: { name: 'Media', icon: '🖼️' },
  composite: { name: 'Composite', icon: '≡' },
  chrome: { name: 'Chrome', icon: '✎' },
  live: { name: 'Live', icon: '⚡' },
}

/**
 * Block Inserter component - shows a floating palette of available blocks
 */
export const BlockInserter: React.FC<BlockInserterProps> = ({
  position,
  visible,
  onSelect,
  onClose,
}) => {
  const blockRegistry = useBlockRegistry()
  const [searchQuery, setSearchQuery] = React.useState('')

  // Get all block definitions, grouped by family
  const blocksByFamily = React.useMemo(() => {
    if (!blockRegistry) return {}
    
    const groups: Record<string, Array<{ id: string; name: string; summary?: string; keywords?: string[] }>> = {}
    
    blockRegistry.forEach((def) => {
      const family = def.family
      if (!groups[family]) {
        groups[family] = []
      }
      groups[family].push({
        id: def.type,
        name: def.name,
        summary: def.summary,
        keywords: def.keywords,
      })
    })
    
    return groups
  }, [blockRegistry])

  // Filter blocks by search query
  const filteredBlocks = React.useMemo(() => {
    if (!searchQuery.trim()) {
      return blocksByFamily
    }
    
    const query = searchQuery.toLowerCase()
    const result: Record<string, Array<{ id: string; name: string; summary?: string; keywords?: string[] }>> = {}
    
    Object.entries(blocksByFamily).forEach(([family, blocks]) => {
      const filtered = blocks.filter((block) => {
        if (block.name.toLowerCase().includes(query)) return true
        if (block.keywords?.some((k) => k.toLowerCase().includes(query))) return true
        if (block.summary?.toLowerCase().includes(query)) return true
        return false
      })
      if (filtered.length > 0) {
        result[family] = filtered
      }
    })
    
    return result
  }, [searchQuery, blocksByFamily])

  // Handle click outside to close
  React.useEffect(() => {
    if (!visible) return
    
    const handleClickOutside = (e: MouseEvent) => {
      // Check if click is outside the inserter
      const target = e.target as Element
      if (target.closest('.block-inserter-container')) {
        return
      }
      onClose()
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [visible, onClose])

  // Keyboard shortcuts
  React.useEffect(() => {
    if (!visible) return
    
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [visible, onClose])

  if (!visible || !position) return null

  return (
    <InserterOverlay onClick={onClose}>
      <InserterContainer 
        className="block-inserter-container"
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          transform: 'translate(-50%, -100%)',
          zIndex: 1000,
        }}
      >
        <InserterSearch
          placeholder="Search blocks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          autoFocus
        />
        
        <InserterContent>
          {Object.entries(filteredBlocks).map(([family, blocks]) => {
            const info = FAMILY_INFO[family as BlockFamily] || { name: family, icon: '📦' }
            return (
              <FamilySection key={family}>
                <FamilyHeader>
                  <FamilyIcon>{info.icon}</FamilyIcon>
                  <FamilyName>{info.name}</FamilyName>
                  <FamilyCount>({blocks.length})</FamilyCount>
                </FamilyHeader>
                
                {blocks.map((block) => (
                  <BlockItem
                    key={block.id}
                    block={block}
                    family={family}
                    onClick={() => onSelect(block.id)}
                    query={searchQuery}
                  />
                ))}
              </FamilySection>
            )
          })}
          
          {Object.keys(filteredBlocks).length === 0 && searchQuery && (
            <NoResults>
              No blocks found matching "{searchQuery}"
            </NoResults>
          )}
        </InserterContent>
      </InserterContainer>
    </InserterOverlay>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Sub-components                                                                  */
/* ─────────────────────────────────────────────────────────────────────────────── */

function FamilySection({ children }: { children: React.ReactNode }) {
  return <FamilySectionStyled>{children}</FamilySectionStyled>
}

function FamilyHeader({ children }: { children: React.ReactNode }) {
  return <FamilyHeaderStyled>{children}</FamilyHeaderStyled>
}

function BlockItem({ block, family, onClick, query }: { 
  block: { id: string; name: string; summary?: string; keywords?: string[] }
  family: string
  onClick: () => void
  query: string
}) {
  const highlightMatch = (text: string) => {
    if (!query.trim()) return text
    const regex = new RegExp(`(${query})`, 'gi')
    return text.split(regex).map((part, i) => {
      if (part.toLowerCase() === query.toLowerCase()) {
        return <mark key={i} style={{ backgroundColor: 'yellow' }}>{part}</mark>
      }
      return part
    })
  }

  return (
    <BlockItemStyled 
      onClick={onClick}
      title={block.summary}
    >
      <BlockIcon>{getBlockIcon(family)}</BlockIcon>
      <BlockInfo>
        <BlockName>{highlightMatch(block.name)}</BlockName>
        {block.summary && (
          <BlockSummary>{highlightMatch(block.summary)}</BlockSummary>
        )}
      </BlockInfo>
    </BlockItemStyled>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Utils                                                                         */
/* ─────────────────────────────────────────────────────────────────────────────── */

function getBlockIcon(family: string): string {
  const info = FAMILY_INFO[family as BlockFamily]
  return info ? info.icon : '📦'
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Styled Components                                                             */
/* ─────────────────────────────────────────────────────────────────────────────── */

const InserterOverlay = styled('div', {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.1)',
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
  padding: '20px',
  zIndex: 100,
})

const InserterContainer = styled('div', {
  width: '320px',
  maxHeight: '80vh',
  backgroundColor: '$bg',
  border: '1px solid $border',
  borderRadius: '8px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  overflow: 'hidden',
})

const InserterSearch = styled('input', {
  width: '100%',
  padding: '12px 16px',
  border: 'none',
  borderBottom: '1px solid $border',
  fontSize: '14px',
  outline: 'none',
  backgroundColor: '$bg',
  color: '$text',
})

const InserterContent = styled('div', {
  overflowY: 'auto',
  maxHeight: '400px',
})

const FamilySection = styled('div', {
  padding: '8px 0',
})

const FamilyHeader = styled('div', {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '8px 16px',
  backgroundColor: '$bgHover',
  fontWeight: 500,
  fontSize: '12px',
  color: '$textMuted',
})

const FamilyIcon = styled('span', {
  fontSize: '14px',
})

const FamilyName = styled('span', {
  flex: 1,
})

const FamilyCount = styled('span', {
  color: '$textMuted',
  fontSize: '12px',
})

const BlockItemStyled = styled('div', {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '8px',
  padding: '12px 16px',
  cursor: 'pointer',
  transition: 'background 0.15s',
  
  '&:hover': {
    background: '$bgHover',
  },
})

const BlockIcon = styled('span', {
  fontSize: '18px',
  marginTop: '2px',
})

const BlockInfo = styled('div', {
  flex: 1,
  minWidth: 0,
})

const BlockName = styled('span', {
  display: 'block',
  fontWeight: 500,
  fontSize: '14px',
  color: '$text',
  marginBottom: '2px',
})

const BlockSummary = styled('span', {
  display: 'block',
  fontSize: '12px',
  color: '$textMuted',
  lineHeight: 1.3,
})

const NoResults = styled('div', {
  padding: '32px 16px',
  textAlign: 'center',
  color: '$textMuted',
  fontSize: '14px',
})