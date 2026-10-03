/**
 * Block Inserter gallery component.
 *
 * B7 implementation — a docked-left panel (~400px) showing every registered block
 * as a card with a live preview thumbnail, name, and shortDescription. Tabs are semantic
 * categories (what a block is for), the family stays available as a filter in the search row,
 * and a search bar filters across everything by name, shortDescription and keywords.
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
import { BLOCK_CATEGORIES, CATEGORY_INFO } from '../../blocks/types'
import type { BlockCategory, BlockDefinition, BlockFamily } from '../../blocks/types'

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

const SCOPE_TITLE = {
  element: 'One atom',
  group: 'A self-contained unit that fills one region',
  slide: 'Fills the whole content area; use it alone on a slide',
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
  const [activeCategory, setActiveCategory] = React.useState<BlockCategory | 'all'>('all')
  const [familyFilter, setFamilyFilter] = React.useState<BlockFamily | 'all'>('all')

  // Groups: category → def[] (BLOCK_CATEGORIES order; uncategorised host blocks land in 'structure').
  const blocksByCategory = React.useMemo(
    () => blockRegistry?.listByCategory() ?? new Map<BlockCategory, BlockDefinition[]>(),
    [blockRegistry],
  )

  // Categories with at least one block, in canonical order. Empty categories are hidden.
  const availableCategories = BLOCK_CATEGORIES.filter((c) => (blocksByCategory.get(c)?.length ?? 0) > 0)

  // Families that have at least one block, for the developer filter.
  const availableFamilies = React.useMemo(() => {
    const set = new Set<BlockFamily>()
    for (const def of blockRegistry?.list() ?? []) set.add(def.family)
    return Array.from(set)
  }, [blockRegistry])

  // Filtered blocks based on search + active category + family filter.
  const filteredBlocks = React.useMemo(() => {
    if (!blockRegistry) return []

    let all =
      activeCategory === 'all'
        ? availableCategories.flatMap((c) => blocksByCategory.get(c) ?? [])
        : blocksByCategory.get(activeCategory) ?? []

    if (familyFilter !== 'all') {
      all = all.filter((def) => def.family === familyFilter)
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      all = all.filter((def) => {
        if (def.name.toLowerCase().includes(query)) return true
        if ((def.shortDescription ?? def.summary)?.toLowerCase().includes(query)) return true
        if (def.keywords?.some((k) => k.toLowerCase().includes(query))) return true
        return false
      })
    }

    return all
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockRegistry, searchQuery, activeCategory, familyFilter, blocksByCategory])

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
    <InserterOverlay>
      <InserterContainer
        className="tls-block-inserter"
        onClick={(e) => e.stopPropagation()}
      >
        <SearchRow>
          <InserterSearch
            ref={searchRef}
            placeholder="Search blocks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <FamilySelect
            aria-label="Filter by family"
            title="Filter by family (developer)"
            value={familyFilter}
            onChange={(e) => setFamilyFilter(e.target.value as BlockFamily | 'all')}
          >
            <option value="all">All families</option>
            {availableFamilies.map((family) => (
              <option key={family} value={family}>
                {FAMILY_INFO[family].name}
              </option>
            ))}
          </FamilySelect>
        </SearchRow>

        <FamilyTabs>
          <FamilyTab active={activeCategory === 'all'} onClick={() => setActiveCategory('all')}>
            All
          </FamilyTab>
          {availableCategories.map((category) => {
            const info = CATEGORY_INFO[category]
            const count = blocksByCategory.get(category)?.length ?? 0
            return (
              <FamilyTab
                key={category}
                active={activeCategory === category}
                title={info.description}
                onClick={() => setActiveCategory(category)}
              >
                {info.label} ({count})
              </FamilyTab>
            )
          })}
        </FamilyTabs>

        <InserterContent>
          {filteredBlocks.length === 0 ? (
            <NoResults>
              {searchQuery
                ? `No blocks match "${searchQuery}"`
                : 'No blocks in this category'}
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
      {def.size.preferred ? (
        <PreviewContainer>
          <BlockPreview def={def} width={width} />
        </PreviewContainer>
      ) : (
        <PreviewPlaceholder>
          <span>{getFamilyIcon(def.family)}</span>
        </PreviewPlaceholder>
      )}
      <CardText>
        <CardNameRow>
          <CardName title={def.name}>{def.name}</CardName>
          {def.scope && def.scope !== 'element' && (
            <ScopeBadge data-testid="scope-badge" title={SCOPE_TITLE[def.scope]}>
              {def.scope === 'slide' ? 'Slide' : 'Group'}
            </ScopeBadge>
          )}
        </CardNameRow>
        {(def.shortDescription ?? def.summary) && (
          <CardSummary title={def.shortDescription ?? def.summary}>{def.shortDescription ?? def.summary}</CardSummary>
        )}
      </CardText>
    </Card>
  )
}

function getFamilyIcon(family: BlockFamily): string {
  return FAMILY_INFO[family]?.icon ?? '📦'
}

/* ── Styled components ───────────────────────────────────────────────────────── */

// pointerEvents: 'none' — this overlay sits as a DOM sibling of the canvas
// Renderer, not an ancestor, so it must not intercept hit-testing: a native
// drag-and-drop 'drop' event is targeted by hit-testing at the pointer
// position, and if this div caught it, it would never bubble to the
// Renderer/TldrawApp.onDrop underneath. Closing on an outside click is
// instead handled by the document-level mousedown listener above, which
// still fires normally (pointer-events only affects hit-testing, not
// listeners on ancestors like `document`).
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
  pointerEvents: 'none',
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
  pointerEvents: 'auto',
})

const InserterSearch = styled('input', {
  flex: 1,
  minWidth: 0,
  padding: '12px 16px',
  border: 'none',
  fontSize: '14px',
  outline: 'none',
  backgroundColor: '$bg',
  color: '$text',
  boxSizing: 'border-box',
})

const SearchRow = styled('div', {
  display: 'flex',
  alignItems: 'center',
  borderBottom: '1px solid $border',
  flexShrink: 0,
})

const FamilySelect = styled('select', {
  margin: '0 12px 0 0',
  padding: '4px 6px',
  fontSize: '11px',
  color: '$textMuted',
  backgroundColor: '$bg',
  border: '1px solid $border',
  borderRadius: '4px',
  flexShrink: 0,
  maxWidth: '110px',
})

const FamilyTabs = styled('div', {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '4px',
  padding: '8px 12px',
  borderBottom: '1px solid $border',
  maxHeight: '104px',
  overflowY: 'auto',
  flexShrink: 0,
})

const FamilyTab = styled('button', {
  padding: '4px 8px',
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
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
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
  minWidth: 0,

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

const CardNameRow = styled('div', {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  marginBottom: '2px',
  minWidth: 0,
})

const ScopeBadge = styled('span', {
  flexShrink: 0,
  padding: '0 5px',
  borderRadius: '8px',
  border: '1px solid $border',
  fontSize: '9px',
  lineHeight: '14px',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: '$textMuted',
})

const CardName = styled('div', {
  fontWeight: 500,
  fontSize: '14px',
  color: '$text',
  minWidth: 0,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
})

// Two lines, then an ellipsis: a shortDescription is a sentence fragment, too long for one line.
const CardSummary = styled('div', {
  fontSize: '11px',
  color: '$textMuted',
  lineHeight: 1.3,
  overflow: 'hidden',
  display: '-webkit-box',
  '-webkit-line-clamp': 2,
  '-webkit-box-orient': 'vertical',
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
