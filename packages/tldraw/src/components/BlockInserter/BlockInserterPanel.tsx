import * as React from 'react'
import { Utils } from '@tlslides/core'
import { useTldrawApp, useBlockRegistry } from '~hooks'
import { styled } from '~styles'
import { blockToShape } from '~blocks/shape-bridge'
import type { BlockSpec } from '~blocks/types'
import { BlockInserter } from './BlockInserter'

// R13 — a "+" trigger button plus the floating palette it opens. Inserting a block clones its
// `defaults` (the definition's own "good-looking with no input" instance — see
// `BlockDefinition.defaults` in `blocks/types.ts`) into a `BlockSpec` and runs it through
// `blockToShape`, the same bridge `compileSlide` uses, so an inserted block is indistinguishable
// from one that came out of a compiled DeckSpec.
export const BlockInserterPanel = React.memo(function BlockInserterPanel() {
  const app = useTldrawApp()
  const blockRegistry = useBlockRegistry()
  const [open, setOpen] = React.useState(false)
  const buttonRef = React.useRef<HTMLButtonElement>(null)
  const [anchor, setAnchor] = React.useState<{ x: number; y: number } | null>(null)

  const handleOpen = () => {
    const rect = buttonRef.current?.getBoundingClientRect()
    setAnchor(rect ? { x: rect.left + rect.width / 2, y: rect.top } : null)
    setOpen(true)
  }

  const handleSelect = (blockType: string) => {
    const def = blockRegistry?.get(blockType)
    if (!def) {
      setOpen(false)
      return
    }
    const [width, height] = def.size.preferred
    const center = app.getPagePoint(app.centerPoint, app.currentPageId)
    const spec: BlockSpec = {
      type: def.type,
      id: Utils.uniqueId(),
      props: JSON.parse(JSON.stringify(def.defaults)),
    }
    const shape = blockToShape(
      spec,
      { x: center[0] - width / 2, y: center[1] - height / 2, width, height },
      // `blockToShape`'s own default `parentId` is the literal string `"page"` — meaningless
      // here, where each slide is its own page keyed by its slide id. Without this, the shape
      // is parented to a page that doesn't exist and the app throws in unrelated shape-tree code
      // that assumes every shape's parent page is real.
      { parentId: app.currentPageId, definitionMotion: def.motion }
    )
    app.createShapes(shape)
    app.select(shape.id)
    setOpen(false)
  }

  if (!blockRegistry) return null

  return (
    <>
      <TriggerButton
        ref={buttonRef}
        id="TD-BlockInserter-Trigger"
        onClick={handleOpen}
        title="Insert block"
      >
        +
      </TriggerButton>
      <BlockInserter
        position={anchor}
        visible={open}
        onSelect={handleSelect}
        onClose={() => setOpen(false)}
      />
    </>
  )
})

const TriggerButton = styled('button', {
  position: 'absolute',
  left: 16,
  bottom: 16,
  zIndex: 200,
  width: 40,
  height: 40,
  borderRadius: '50%',
  border: '1px solid $border',
  backgroundColor: '$bg',
  color: '$text',
  fontSize: 22,
  lineHeight: 1,
  cursor: 'pointer',
  boxShadow: '$panel',
  '&:hover': { backgroundColor: '$bgHover' },
})
