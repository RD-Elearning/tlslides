/**
 * Block Inserter gallery component.
 *
 * B7 implementation — a docked-left panel (~400px) showing every registered block
 * as a card with a live preview thumbnail, name, and summary. Blocks are grouped
 * by family with tab navigation, and a search bar filters across all families.
 *
 * Inserting happens via:
 *  - **Click** on a card → `onInsert(type)` (inset at viewport centre)
 *  - **Drag-and-drop** with `application/x-tls-block` mime type → handled by the
 *    canvas drop zone, which calls `onInsert(type, pagePoint)`
 *
 * The gallery stays open after insert (docked mode — users add several blocks).
 * Escape closes it.
 */

import * as React from 'react'
import { styled } from '../../styles'
import { useBlockRegistry } from '../../hooks'
import { BlockPreview } from './BlockPreview'
import type { BlockDefinition, BlockFamily } from '../../blocks/types'

export interface BlockInserterProps {
  /** Called when a block is selected for insertion. */
  onInsert: (type: string) => void
  /** Called to close the gallery. */
  onClose: () => void
  /** Whether the gallery is visible. */
  visible: boolean
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

/** Width of each gallery card in CSS px. */
const CARD_WIDTH = 160
/** Height of each preview thumbnail in CSS px. */
const PREVIEW_HEIGHT = 100
/** Gap between preview image and text in the card. */
const CARD_PADDING = 8

/**
 * Block Inserter gallery — shows every registered block as a card with a live
 * preview thumbnail, name, and summary.
 */
export const BlockInserter: React.FC<BlockInserterProps> = ({ onInsert, onClose }) => {
  const blockRegistry = useBlockRegistry()
  const [searchQuery, setSearchQuery] = React.useState('')
  const [activeFamily, setActiveFamily] = React.useState<BlockFamily | 'all'>('all')

  // Groups: family → def[]
  const blocksByFamily = React.useMemo(() => {
    if (!blockRegistry) return new Map<BlockFamily, BlockDefinition[]>()

    const groups = new Map<BlockFamily, BlockDefinition[]>()
    for (const def of blockRegistry.list()) {
      const arr = groups.get(def.family) ?? []
      arr.push(def)
      groups.set(def.family, arr)
    }
    return groups
  }, [blockRegistry])

  // Families that have at least one block (for tab rendering).
  // Drop 'live' from chips if it has 0 blocks (B7 plan).
  const availableFamilies = Array.from(blocksByFamily.keys()).filter(
    (f) => f !== 'live' || (blocksByFamily.get(f)?.length ?? 0) > 0,
  )

  // Filtered blocks based on search + active family.
  const filteredBlocks = React.useMemo(() => {
    if (!blockRegistry) return []

    let all = blockRegistry.list()

    // Family filter
    if (activeFamily !== 'all') {
      all = all.filter((def) => def.family === activeFamily)
    } else {
      // Exclude 'live' family when showing 'all' if it's empty (per B7 plan).
      all = all.filter((def) => def.family !== 'live' || (blocksByFamily.get('live')?.length ?? 0) > 0)
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      all = all.filter((def) => {
        if (def.name.toLowerCase().includes(query)) return true
        if (def.summary?.toLowerCase().includes(query)) return true
        if (def.keywords?.some((k) => k.toLowerCase().includes(query))) return true
        return false
      })
    }

    return all
  }, [blockRegistry, searchQuery, activeFamily, blocksByFamily])

  // Click-outside to close
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element
      if (target.closest('.tls-block-inserter')) {
        return
      }
      onClose()
    }

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  // Focus the search input when the gallery opens
  const searchRef = React.useRef<HTMLInputElement>(null)
  React.useEffect(() => {
    searchRef.current?.focus()
  }, [])

  return (
    <InserterOverlay onClick={onClose}>
      <InserterContainer
        className="tls-block-inserter"
        onClick={(e) => e.stopPropagation()}
      >
        <InserterSearch
          ref={searchRef}
          placeholder="Search blocks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <FamilyTabs>
          <FamilyTab
            active={activeFamily === 'all'}
            onClick={() => setActiveFamily('all')}
          >
            All
          </FamilyTab>
          {availableFamilies.map((family) => {
            const info = FAMILY_INFO[family]
            const count = blocksByFamily.get(family)?.length ?? 0
            return (
              <FamilyTab
                key={family}
                active={activeFamily === family}
                onClick={() => setActiveFamily(family)}
              >
                {info.icon} {info.name} ({count})
              </FamilyTab>
            )
          })}
        </FamilyTabs>

        <InserterContent>
          {filteredBlocks.length === 0 ? (
            <NoResults>
              {searchQuery
                ? `No blocks match "${searchQuery}"`
                : 'No blocks in this family'}
            </NoResults>
          ) : (
            <BlockGrid>
              {filteredBlocks.map((def) => (
                <BlockCard
                  key={def.type}
                  def={def}
                  width={CARD_WIDTH}
                  onClick={() => onInsert(def.type)}
                />
              ))}
            </BlockGrid>
          )}
        </InserterContent>
        <InserterFooter>
          <kbd>Esc</kbd> to close · Drag blocks to canvas
        </InserterFooter>
      </InserterContainer>
    </InserterOverlay>
  )
}

/* ── BlockCard ───────────────────────────────────────────────────────────────── */

interface BlockCardProps {
  def: BlockDefinition
  width: number
  onClick: () => void
}

const BlockCard: React.FC<BlockCardProps> = ({ def, width, onClick }) => {
  const [expanded, setExpanded] = React.useState(false)

  return (
    <Card
      className="tls-block-card"
      data-testid="block-card"
      data-block-type={def.type}
      hasPreview={!!def.describe?.example || !!def.defaults}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      draggable={true}
      onDragStart={(e) => {
        // H5: HTML5 DnD — set the block type as the drag data.
        e.dataTransfer.setData('application/x-tls-block', def.type)
        // Set a transparent drag image so the default ghost doesn't show.
        const blank = new Image()
        blank.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
        e.dataTransfer.setDragImage(blank, 0, 0)
        e.stopPropagation()
      }}
    >
      {expanded && def.size.preferred ? (
        <PreviewContainer>
          <BlockPreview def={def} width={width} />
        </PreviewContainer>
      ) : (
        <PreviewPlaceholder>
          <span>{getFamilyIcon(def.family)}</span>
        </PreviewPlaceholder>
      )}
      <CardText>
        <CardName title={def.name}>{def.name}</CardName>
        {def.summary && <CardSummary>{def.summary}</CardSummary>}
      </CardText>
    </Card>
  )
}

function getFamilyIcon(family: BlockFamily): string {
  return FAMILY_INFO[family]?.icon ?? '📦'
}

/* ── Styled components ───────────────────────────────────────────────────────── */

const InserterOverlay = styled('div', {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.3)',
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'flex-start',
  padding: '56px 16px 16px',
  zIndex: 1000,
})

const InserterContainer = styled('div', {
  width: '400px',
  maxHeight: 'calc(100vh - 72px)',
  backgroundColor: '$bg',
  border: '1px solid $border',
  borderRadius: '8px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  display: 'flex',
  flexDirection: 'column',
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
  boxSizing: 'border-box',
})

const FamilyTabs = styled('div', {
  display: 'flex',
  gap: '4px',
  padding: '8px 12px',
  borderBottom: '1px solid $border',
  overflowX: 'auto',
  flexShrink: 0,
})

const FamilyTab = styled('button', {
  padding: '6px 12px',
  borderRadius: '4px',
  border: '1px solid transparent',
  background: 'transparent',
  fontSize: '12px',
  fontWeight: 500,
  color: '$textMuted',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  transition: 'all 0.15s',

  variants: {
    active: {
      true: {
        backgroundColor: '$bgHover',
        color: '$text',
        borderColor: '$border',
      },
    },
  },

  '&:hover': {
    backgroundColor: '$bgHover',
    color: '$text',
  },
})

const InserterContent = styled('div', {
  flex: 1,
  overflowY: 'auto',
})

const BlockGrid = styled('div', {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: '8px',
  padding: '12px',
})

const Card = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  cursor: 'pointer',
  borderRadius: '6px',
  border: '1px solid transparent',
  transition: 'border-color 0.15s, background 0.15s',
  boxSizing: 'border-box',

  '&:hover': {
    borderColor: '$border',
    backgroundColor: '$bgHover',
  },

  variants: {
    hasPreview: {
      true: {},
    },
  },
})

const PreviewContainer = styled('div', {
  width: '100%',
  height: `${PREVIEW_HEIGHT}px`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderBottom: '1px solid $border',
  boxSizing: 'border-box',
  overflow: 'hidden',
})

const PreviewPlaceholder = styled('div', {
  width: '100%',
  height: `${PREVIEW_HEIGHT}px`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderBottom: '1px solid $border',
  fontSize: '24px',
})

const CardText = styled('div', {
  padding: `${CARD_PADDING}px`,
  boxSizing: 'border-box',
})

const CardName = styled('div', {
  fontWeight: 500,
  fontSize: '14px',
  color: '$text',
  marginBottom: '2px',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
})

const CardSummary = styled('div', {
  fontSize: '11px',
  color: '$textMuted',
  lineHeight: 1.3,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
})

const NoResults = styled('div', {
  padding: '32px 16px',
  textAlign: 'center',
  color: '$textMuted',
  fontSize: '14px',
})

const InserterFooter = styled('div', {
  padding: '8px 16px',
  fontSize: '11px',
  color: '$textMuted',
  textAlign: 'center',
  borderTop: '1px solid $border',
  flexShrink: 0,
})
