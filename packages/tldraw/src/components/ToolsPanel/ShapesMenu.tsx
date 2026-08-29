import * as React from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Panel } from '~components/Primitives/Panel'
import { ToolButton } from '~components/Primitives/ToolButton'
import { TDShapeType, TDSnapshot, TDToolType } from '~types'
import { useTldrawApp } from '~hooks'
import {
  SquareIcon,
  CircleIcon,
  VercelLogoIcon,
  StarIcon,
  ChatBubbleIcon,
} from '@radix-ui/react-icons'
import { Tooltip } from '~components/Primitives/Tooltip'
import { LineIcon } from '~components/Primitives/icons'

interface ShapesMenuProps {
  activeTool: TDToolType
  isToolLocked: boolean
}

type ShapeShape =
  | TDShapeType.Rectangle
  | TDShapeType.Ellipse
  | TDShapeType.Triangle
  | TDShapeType.Line
  // Phase 8c
  | TDShapeType.Polygon
  | TDShapeType.Star
  | TDShapeType.SpeechBubble

const shapeShapes: ShapeShape[] = [
  TDShapeType.Rectangle,
  TDShapeType.Ellipse,
  TDShapeType.Triangle,
  TDShapeType.Line,
  TDShapeType.Polygon,
  TDShapeType.Star,
  TDShapeType.SpeechBubble,
]

const shapeShapeIcons = {
  [TDShapeType.Rectangle]: <SquareIcon />,
  [TDShapeType.Ellipse]: <CircleIcon />,
  [TDShapeType.Triangle]: <VercelLogoIcon />,
  [TDShapeType.Line]: <LineIcon />,
  // Phase 8c — no dedicated hexagon glyph in this icon set; `VercelLogoIcon` is already reused for
  // Triangle above (its own shape has nothing to do with Vercel either), so reusing `SquareIcon`
  // for the general "N-sided polygon" tool follows the same precedent rather than adding a new
  // custom SVG icon for one toolbar button.
  [TDShapeType.Polygon]: <SquareIcon />,
  [TDShapeType.Star]: <StarIcon />,
  [TDShapeType.SpeechBubble]: <ChatBubbleIcon />,
}

// Phase 8c — the original four tools' keyboard shortcut happened to equal `4 + <array index>`
// (r=4, o=5, g=6, l=7), so the tooltip below used to compute it rather than list it; the three new
// shapes' shortcuts (`useKeyboardShortcuts.tsx`) are bare letters with no such numeric pattern
// (every digit was already spoken for), so this is now an explicit table for all seven instead of
// keeping the arithmetic for four and bolting on a special case for three.
const shapeShapeKbds: Record<ShapeShape, string> = {
  [TDShapeType.Rectangle]: '4',
  [TDShapeType.Ellipse]: '5',
  [TDShapeType.Triangle]: '6',
  [TDShapeType.Line]: '7',
  [TDShapeType.Polygon]: 'h',
  [TDShapeType.Star]: 'j',
  [TDShapeType.SpeechBubble]: 'b',
}

// `SpeechBubble`'s enum value (`'speechBubble'`) is the one multi-word case — the pre-existing
// `shape[0].toUpperCase() + shape.slice(1)` tooltip label works fine for every single-word shape
// but would render this one as "SpeechBubble" with no space, so it gets an explicit override.
const shapeShapeLabels: Partial<Record<ShapeShape, string>> = {
  [TDShapeType.SpeechBubble]: 'Speech Bubble',
}

const statusSelector = (s: TDSnapshot) => s.appState.status

enum Status {
  SpacePanning = 'spacePanning',
}

export const ShapesMenu = React.memo(function ShapesMenu({
  activeTool,
  isToolLocked,
}: ShapesMenuProps) {
  const app = useTldrawApp()

  const status = app.useStore(statusSelector)

  const [lastActiveTool, setLastActiveTool] = React.useState<ShapeShape>(TDShapeType.Rectangle)

  React.useEffect(() => {
    if (shapeShapes.includes(activeTool as ShapeShape) && lastActiveTool !== activeTool) {
      setLastActiveTool(activeTool as ShapeShape)
    }
  }, [activeTool])

  const selectShapeTool = React.useCallback(() => {
    app.selectTool(lastActiveTool)
  }, [activeTool, app])

  const handleDoubleClick = React.useCallback(() => {
    app.toggleToolLock()
  }, [app])

  const handleKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === ' ') {
      if (app.shiftKey) {
        e.preventDefault()
      }
    }
  }, [])

  const isActive = shapeShapes.includes(activeTool as ShapeShape)

  return (
    <DropdownMenu.Root dir="ltr" onOpenChange={selectShapeTool}>
      <DropdownMenu.Trigger dir="ltr" asChild id="TD-PrimaryTools-Shapes">
        <ToolButton
          disabled={isActive && app.shiftKey} // otherwise this continuously opens and closes on "SpacePanning"
          variant="primary"
          onDoubleClick={handleDoubleClick}
          isToolLocked={isActive && isToolLocked}
          isActive={isActive}
          onKeyDown={handleKeyDown}
        >
          {shapeShapeIcons[lastActiveTool]}
        </ToolButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content asChild dir="ltr" side="top" sideOffset={12}>
        <Panel side="center">
          {shapeShapes.map((shape) => (
            <Tooltip
              key={shape}
              label={shapeShapeLabels[shape] ?? shape[0].toUpperCase() + shape.slice(1)}
              kbd={shapeShapeKbds[shape]}
              id={`TD-PrimaryTools-Shapes-${shape}`}
            >
              <DropdownMenu.Item asChild>
                <ToolButton
                  variant="primary"
                  onClick={() => {
                    app.selectTool(shape)
                    setLastActiveTool(shape)
                  }}
                >
                  {shapeShapeIcons[shape]}
                </ToolButton>
              </DropdownMenu.Item>
            </Tooltip>
          ))}
        </Panel>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  )
})
