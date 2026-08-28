import { Utils } from '@tlslides/core'
import { DEFAULT_SLIDE_SIZE } from '~constants'
import { Rectangle, Text, Ellipse, Line } from './shapes'
import { defaultStyle, defaultTextStyle, themeToken } from './shapes/shared'
import {
  AlignStyle,
  DeckTheme,
  FontStyle,
  SizeStyle,
  ShapeStyles,
  Template,
  TDShape,
  TDShapeType,
} from '~types'

// ---------------------------------------------------------------------------------------------
// Small, local shape builders (T13.2)
// ---------------------------------------------------------------------------------------------
// These exist only to keep the 12 layouts below readable — they are not a public API. Every
// builder starts from the real default style objects (`defaultStyle`/`defaultTextStyle`, the same
// ones every shape falls back to today) and overrides only what a given element needs, so a
// template shape is always a complete, valid `ShapeStyles`, not a bare partial relying on a
// particular `getShape` implementation's merge behaviour (Line's, notably, does not deep-merge).
//
// Colours are theme tokens (`themeToken('accent1')`), never literal hex — see `deck-theme.ts`.
// `font` is deliberately left unset here: `addSlideFromTemplate` assigns it from the active
// theme's heading/body pairing at instantiation time (see that command for why this one field
// is not resolved live the way colours are). `cornerRadius` is likewise left unset on every panel
// so the active theme's own `shapeDefaults.cornerRadius` decides how rounded it is.

function textShape(
  id: string,
  point: number[],
  value: string,
  style: Partial<ShapeStyles>,
  slot?: string
): TDShape {
  return Text.getShape({
    id,
    point,
    text: value,
    slot,
    childIndex: 1,
    // `font` is forced back to `style.font` (always `undefined` for every call in this file) even
    // though the spread just above pulls in `defaultTextStyle.font` (`FontStyle.Sans`) — see the
    // module doc: a template must NOT bake in a concrete font, so `buildTemplateShapes` has an
    // actual `undefined` to detect and replace with the active theme's pairing.
    style: { ...defaultTextStyle, ...style, font: style.font },
  })
}

function panel(
  id: string,
  point: number[],
  size: number[],
  style: Partial<ShapeStyles>,
  opts: { label?: string; slot?: string } = {}
): TDShape {
  return Rectangle.getShape({
    id,
    point,
    size,
    label: opts.label,
    slot: opts.slot,
    childIndex: 1,
    style: { ...defaultStyle, isFilled: true, strokeWidth: 0, ...style },
  })
}

function dot(id: string, center: number[], r: number, style: Partial<ShapeStyles>): TDShape {
  return Ellipse.getShape({
    id,
    point: [center[0] - r, center[1] - r],
    radius: [r, r],
    childIndex: 1,
    style: { ...defaultStyle, isFilled: true, strokeWidth: 0, ...style },
  })
}

function divider(
  id: string,
  start: number[],
  end: number[],
  style: Partial<ShapeStyles>
): TDShape {
  // `LineShape.handles` are local to `shape.point` (verified against a real LineTool-drawn shape:
  // `start` is always `[0, 0]`, `end` is the offset, and `point` carries the absolute start) — NOT
  // a pair of absolute page coordinates. Getting this backwards (an earlier version of this
  // function passed `start`/`end` straight through as both `point: [0, 0]` and the handle points)
  // still computed the *correct* absolute bounds — `getBounds` derives bounds from the handles and
  // only then translates by `shape.point`, so a `[0, 0]` shape.point silently no-ops there — but it
  // rendered those same absolute coordinates as the *local* SVG path inside a container sized and
  // positioned to the (correct) bounds. For a perfectly vertical/horizontal divider (zero-width or
  // zero-height bounds) that put the drawn path entirely outside the container's own clipped
  // viewport, so the line was not merely faint, it was rendered completely off-screen inside its
  // own box: `overflow: hidden` on `.tl-positioned-svg` (`useStyle.tsx`) discarded 100% of it.
  // Diagonal lines mostly hid the same bug (their bounds have real width AND height, so the local
  // coordinates land inside a large-enough box, even if not centered on it as intended); a
  // perfectly straight divider is what exposed it.
  return Line.getShape({
    id,
    point: start,
    childIndex: 1,
    handles: {
      start: { id: 'start', index: 0, point: [0, 0] },
      end: { id: 'end', index: 1, point: [end[0] - start[0], end[1] - start[1]] },
    },
    style: { ...defaultStyle, isFilled: false, ...style },
  })
}

const T = themeToken
const [W, H] = DEFAULT_SLIDE_SIZE

// ---------------------------------------------------------------------------------------------
// The starter pack (T13.4) — twelve real slide layouts on the 1920×1080 frame.
// ---------------------------------------------------------------------------------------------
export const BUILT_IN_TEMPLATES: Template[] = [
  {
    id: 'title',
    name: 'Title',
    size: [W, H],
    background: { type: 'solid', color: T('background') },
    shapes: [
      panel('kicker', [160, 392], [110, 10], { fill: T('accent1') }),
      textShape('title', [160, 430], 'Your Big Idea Starts Here', {
        stroke: T('text'),
        size: SizeStyle.Large,
        scale: 1.05,
      }, 'title'),
    ],
  },
  {
    id: 'title-subtitle',
    name: 'Title & Subtitle',
    size: [W, H],
    background: { type: 'solid', color: T('background') },
    shapes: [
      panel('kicker', [160, 340], [110, 10], { fill: T('accent1') }),
      textShape('title', [160, 378], 'Presentation Title', {
        stroke: T('text'),
        size: SizeStyle.Large,
        scale: 0.95,
      }, 'title'),
      textShape('subtitle', [160, 520], 'A concise, compelling subtitle goes here', {
        stroke: T('textMuted'),
        size: SizeStyle.Medium,
        scale: 0.85,
      }, 'subtitle'),
    ],
  },
  {
    id: 'section-break',
    name: 'Section Break',
    size: [W, H],
    // Full-bleed accent background — the one layout in the pack that paints with `accent1`
    // instead of `background`, so it reads as a clear divider between sections of a deck. Text
    // uses the `background` token for contrast: every built-in theme's `background` is chosen to
    // sit at the opposite end of the palette from its `accent1`, so this pairing holds up across
    // all five (see the Phase 12 report).
    background: { type: 'solid', color: T('accent1') },
    shapes: [
      textShape('eyebrow', [160, 440], 'SECTION 01', {
        stroke: T('background'),
        size: SizeStyle.Small,
        scale: 1.1,
      }, 'eyebrow'),
      textShape('title', [160, 480], 'Section Title', {
        stroke: T('background'),
        size: SizeStyle.Large,
        scale: 1.1,
      }, 'title'),
    ],
  },
  {
    id: 'bullets',
    name: 'Bullets',
    size: [W, H],
    background: { type: 'solid', color: T('background') },
    shapes: [
      textShape('title', [160, 140], 'Key Points', {
        stroke: T('text'),
        size: SizeStyle.Large,
        scale: 0.7,
      }, 'title'),
      dot('dot1', [178, 362], 9, { fill: T('accent1') }),
      textShape('bullet1', [210, 340], 'First key point that supports your message', {
        stroke: T('text'),
        size: SizeStyle.Medium,
        scale: 0.72,
      }, 'bullet1'),
      dot('dot2', [178, 492], 9, { fill: T('accent1') }),
      textShape('bullet2', [210, 470], 'Second key point, kept to a single line', {
        stroke: T('text'),
        size: SizeStyle.Medium,
        scale: 0.72,
      }, 'bullet2'),
      dot('dot3', [178, 622], 9, { fill: T('accent1') }),
      textShape('bullet3', [210, 600], 'Third key point — specific and concrete', {
        stroke: T('text'),
        size: SizeStyle.Medium,
        scale: 0.72,
      }, 'bullet3'),
      dot('dot4', [178, 752], 9, { fill: T('accent1') }),
      textShape('bullet4', [210, 730], 'Fourth key point, if you need one', {
        stroke: T('text'),
        size: SizeStyle.Medium,
        scale: 0.72,
      }, 'bullet4'),
    ],
  },
  {
    id: 'two-column',
    name: 'Two Column',
    size: [W, H],
    background: { type: 'solid', color: T('background') },
    shapes: [
      textShape('title', [160, 110], 'Comparing Two Approaches', {
        stroke: T('text'),
        size: SizeStyle.Large,
        scale: 0.62,
      }, 'title'),
      divider('divider', [960, 280], [960, 900], { stroke: T('textMuted'), strokeWidth: 2, opacity: 0.35 }),
      textShape('leftTitle', [160, 280], 'Approach A', {
        stroke: T('accent1'),
        size: SizeStyle.Medium,
        scale: 0.9,
      }, 'leftTitle'),
      textShape(
        'leftBody',
        [160, 370],
        'First supporting point\nSecond supporting point\nThird supporting point',
        { stroke: T('textMuted'), size: SizeStyle.Medium, scale: 0.6, textAlign: AlignStyle.Start },
        'leftBody'
      ),
      textShape('rightTitle', [1010, 280], 'Approach B', {
        stroke: T('accent2'),
        size: SizeStyle.Medium,
        scale: 0.9,
      }, 'rightTitle'),
      textShape(
        'rightBody',
        [1010, 370],
        'First supporting point\nSecond supporting point\nThird supporting point',
        { stroke: T('textMuted'), size: SizeStyle.Medium, scale: 0.6, textAlign: AlignStyle.Start },
        'rightBody'
      ),
    ],
  },
  {
    id: 'image-left',
    name: 'Image Left',
    size: [W, H],
    background: { type: 'solid', color: T('background') },
    shapes: [
      panel('image', [0, 0], [860, H], { fill: T('surface'), stroke: T('textMuted') }, {
        label: 'Image',
        slot: 'image',
      }),
      textShape('title', [940, 300], 'A Focused Headline', {
        stroke: T('text'),
        size: SizeStyle.Large,
        scale: 0.6,
      }, 'title'),
      textShape(
        'body',
        [940, 420],
        'Use this space to support the headline with one or two\nsentences of context.',
        { stroke: T('textMuted'), size: SizeStyle.Medium, scale: 0.62, textAlign: AlignStyle.Start },
        'body'
      ),
    ],
  },
  {
    id: 'image-right',
    name: 'Image Right',
    size: [W, H],
    background: { type: 'solid', color: T('background') },
    shapes: [
      panel('image', [1060, 0], [860, H], { fill: T('surface'), stroke: T('textMuted') }, {
        label: 'Image',
        slot: 'image',
      }),
      textShape('title', [160, 300], 'A Focused Headline', {
        stroke: T('text'),
        size: SizeStyle.Large,
        scale: 0.6,
      }, 'title'),
      textShape(
        'body',
        [160, 420],
        'Use this space to support the headline with one or two\nsentences of context.',
        { stroke: T('textMuted'), size: SizeStyle.Medium, scale: 0.62, textAlign: AlignStyle.Start },
        'body'
      ),
    ],
  },
  {
    id: 'quote',
    name: 'Quote',
    size: [W, H],
    background: { type: 'solid', color: T('surface') },
    shapes: [
      textShape('mark', [200, 260], '“', {
        stroke: T('accent1'),
        size: SizeStyle.Large,
        scale: 3.2,
      }),
      textShape(
        'quote',
        [280, 420],
        'Design is not just what it looks like.\nDesign is how it works.',
        { stroke: T('text'), size: SizeStyle.Large, scale: 0.6 },
        'quote'
      ),
      textShape('attribution', [280, 660], '— Jane Doe, Design Lead', {
        stroke: T('textMuted'),
        size: SizeStyle.Medium,
        scale: 0.6,
      }, 'attribution'),
    ],
  },
  {
    id: 'stat-row',
    name: 'Stat Row',
    size: [W, H],
    background: { type: 'solid', color: T('background') },
    shapes: [
      textShape('title', [160, 110], 'By The Numbers', {
        stroke: T('text'),
        size: SizeStyle.Large,
        scale: 0.55,
      }, 'title'),
      divider('divider1', [680, 340], [680, 620], { stroke: T('textMuted'), strokeWidth: 2, opacity: 0.35 }),
      divider('divider2', [1260, 340], [1260, 620], { stroke: T('textMuted'), strokeWidth: 2, opacity: 0.35 }),
      textShape('stat1Number', [160, 340], '87%', {
        stroke: T('accent1'),
        size: SizeStyle.Large,
        scale: 1.3,
      }, 'stat1Number'),
      textShape('stat1Label', [160, 520], 'of users report higher satisfaction', {
        stroke: T('textMuted'),
        size: SizeStyle.Medium,
        scale: 0.5,
      }, 'stat1Label'),
      textShape('stat2Number', [740, 340], '3.4x', {
        stroke: T('accent1'),
        size: SizeStyle.Large,
        scale: 1.3,
      }, 'stat2Number'),
      textShape('stat2Label', [740, 520], 'faster time to first result', {
        stroke: T('textMuted'),
        size: SizeStyle.Medium,
        scale: 0.5,
      }, 'stat2Label'),
      textShape('stat3Number', [1320, 340], '12k+', {
        stroke: T('accent1'),
        size: SizeStyle.Large,
        scale: 1.3,
      }, 'stat3Number'),
      textShape('stat3Label', [1320, 520], 'teams already on board', {
        stroke: T('textMuted'),
        size: SizeStyle.Medium,
        scale: 0.5,
      }, 'stat3Label'),
    ],
  },
  {
    id: 'comparison',
    name: 'Comparison',
    size: [W, H],
    background: { type: 'solid', color: T('background') },
    shapes: [
      textShape('title', [160, 90], 'Comparison', {
        stroke: T('text'),
        size: SizeStyle.Large,
        scale: 0.5,
      }, 'title'),
      panel('leftPanel', [160, 220], [760, 760], { fill: T('surface') }),
      textShape('leftTitle', [220, 280], 'Option A', {
        stroke: T('accent1'),
        size: SizeStyle.Medium,
        scale: 0.95,
      }, 'leftTitle'),
      textShape(
        'leftBody',
        [220, 380],
        'Strength one\nStrength two\nBest for smaller teams',
        { stroke: T('text'), size: SizeStyle.Medium, scale: 0.58, textAlign: AlignStyle.Start },
        'leftBody'
      ),
      panel('rightPanel', [1000, 220], [760, 760], { fill: T('surface') }),
      textShape('rightTitle', [1060, 280], 'Option B', {
        stroke: T('accent2'),
        size: SizeStyle.Medium,
        scale: 0.95,
      }, 'rightTitle'),
      textShape(
        'rightBody',
        [1060, 380],
        'Strength one\nStrength two\nBest for scaling up',
        { stroke: T('text'), size: SizeStyle.Medium, scale: 0.58, textAlign: AlignStyle.Start },
        'rightBody'
      ),
    ],
  },
  {
    id: 'timeline',
    name: 'Timeline',
    size: [W, H],
    background: { type: 'solid', color: T('background') },
    shapes: [
      textShape('title', [160, 100], 'Roadmap', {
        stroke: T('text'),
        size: SizeStyle.Large,
        scale: 0.55,
      }, 'title'),
      divider('baseline', [220, 560], [1700, 560], { stroke: T('textMuted'), strokeWidth: 3, opacity: 0.4 }),
      dot('dot1', [380, 560], 14, { fill: T('accent1') }),
      textShape('milestone1Title', [270, 430], 'Milestone 1', {
        stroke: T('text'),
        size: SizeStyle.Medium,
        scale: 0.55,
      }, 'milestone1Title'),
      textShape('milestone1Date', [300, 610], 'Q1 2025', {
        stroke: T('textMuted'),
        size: SizeStyle.Small,
        scale: 0.85,
      }, 'milestone1Date'),
      dot('dot2', [780, 560], 14, { fill: T('accent1') }),
      textShape('milestone2Title', [670, 430], 'Milestone 2', {
        stroke: T('text'),
        size: SizeStyle.Medium,
        scale: 0.55,
      }, 'milestone2Title'),
      textShape('milestone2Date', [700, 610], 'Q2 2025', {
        stroke: T('textMuted'),
        size: SizeStyle.Small,
        scale: 0.85,
      }, 'milestone2Date'),
      dot('dot3', [1180, 560], 14, { fill: T('accent1') }),
      textShape('milestone3Title', [1070, 430], 'Milestone 3', {
        stroke: T('text'),
        size: SizeStyle.Medium,
        scale: 0.55,
      }, 'milestone3Title'),
      textShape('milestone3Date', [1100, 610], 'Q3 2025', {
        stroke: T('textMuted'),
        size: SizeStyle.Small,
        scale: 0.85,
      }, 'milestone3Date'),
      dot('dot4', [1580, 560], 14, { fill: T('accent1') }),
      textShape('milestone4Title', [1470, 430], 'Milestone 4', {
        stroke: T('text'),
        size: SizeStyle.Medium,
        scale: 0.55,
      }, 'milestone4Title'),
      textShape('milestone4Date', [1500, 610], 'Q4 2025', {
        stroke: T('textMuted'),
        size: SizeStyle.Small,
        scale: 0.85,
      }, 'milestone4Date'),
    ],
  },
  {
    id: 'closing',
    name: 'Closing',
    size: [W, H],
    background: { type: 'solid', color: T('background') },
    shapes: [
      // Decorative only — no slot. A soft, low-opacity accent circle bleeding off the top-right
      // corner, using Phase 8a's `opacity` field so it reads as a wash rather than a hard shape.
      Ellipse.getShape({
        id: 'decoration',
        point: [1500, -320],
        radius: [420, 420],
        childIndex: 1,
        style: {
          ...defaultStyle,
          isFilled: true,
          strokeWidth: 0,
          opacity: 0.15,
          fill: T('accent2'),
        },
      }),
      textShape('closingTitle', [200, 440], 'Thank You', {
        stroke: T('text'),
        size: SizeStyle.Large,
        scale: 1.3,
      }, 'closingTitle'),
      textShape('contact', [200, 640], 'hello@yourcompany.com  ·  yourcompany.com', {
        stroke: T('textMuted'),
        size: SizeStyle.Medium,
        scale: 0.6,
      }, 'contact'),
    ],
  },
]

/** Look up a built-in template by id — the string form `TldrawApp.addSlideFromTemplate` accepts
 *  alongside a full `Template` object. */
export function getTemplate(id: string): Template | undefined {
  return BUILT_IN_TEMPLATES.find((template) => template.id === id)
}

// ---------------------------------------------------------------------------------------------
// Slot filling and font pairing (T13.3 / T12.2)
// ---------------------------------------------------------------------------------------------

/** A slot is treated as a *heading* role — and gets the theme's `fonts.heading` face — purely by
 *  naming convention: its name contains "title", "heading", or is exactly "quote". This is a
 *  deliberate simplification over adding a real per-shape role field: every slot name in the
 *  starter pack above already fits the convention, and it keeps a template's shape list plain
 *  `TDShape[]` with nothing tldraw-specific bolted onto the JSON beyond `slot` itself. A host
 *  authoring its own templates that wants finer control can still set `style.font` explicitly —
 *  this heuristic only fires when `font` is left unset. */
function isHeadingSlot(slot: string | undefined): boolean {
  return slot !== undefined && /title|heading|quote/i.test(slot)
}

/** Fill in a shape's text content for a given slot value. Handles every text-bearing shape type
 *  the starter pack uses (`TextShape.text`, `RectangleShape.label`) — a host authoring its own
 *  templates with other slotted shape types can extend this list; an unrecognized shape type is
 *  left untouched rather than throwing, so a stray slot name never breaks the whole insert. */
function applySlotContent(shape: TDShape, value: string): TDShape {
  if (shape.type === TDShapeType.Text || shape.type === TDShapeType.Sticky) {
    return { ...shape, text: value }
  }
  if ('label' in shape) {
    return { ...shape, label: value }
  }
  return shape
}

/**
 * Turn a `Template` plus optional slot content into a ready-to-insert set of shapes for a new
 * page: apply the active theme's heading/body font pairing and `shapeDefaults`, fill in any
 * matching `content[slot]`, and give every shape a fresh id (a template's own ids only need to be
 * unique *within* the template, since they're never persisted as-is).
 *
 * This is deliberately separate from `TldrawApp.insertContent`'s general-purpose id remapper: a
 * template's shapes are always flat (no groups, no bindings, no cross-shape handle references) —
 * see the Phase 13 report — so a plain fresh id per shape is enough, no old-id → new-id table
 * needed.
 */
export function buildTemplateShapes(
  template: Template,
  content: Record<string, string> | undefined,
  deckTheme: DeckTheme | undefined,
  pageId: string
): TDShape[] {
  return template.shapes.map((shape, i) => {
    // Deep-clone, not shallow-spread: `BUILT_IN_TEMPLATES` is a module-level constant reused for
    // every call, so a shallow `{ ...shape }` would still alias nested arrays (`point`, `size`,
    // `handles`) with the template's own definition — the same class of bug `DEFAULT_SLIDE_SIZE`'s
    // doc comment and `setPageBackground`'s array-copy exist to prevent. A later in-place mutation
    // of one inserted slide's shape would otherwise corrupt the template for every future use.
    let next: TDShape = {
      ...Utils.deepClone(shape),
      id: Utils.uniqueId(),
      parentId: pageId,
      childIndex: i + 1,
    }

    if (next.style.font === undefined && deckTheme) {
      next.style.font = isHeadingSlot(next.slot) ? deckTheme.fonts.heading : deckTheme.fonts.body
    }

    if (deckTheme?.shapeDefaults) {
      next.style = { ...deckTheme.shapeDefaults, ...next.style }
    }

    if (next.slot && content?.[next.slot] !== undefined) {
      next = applySlotContent(next, content[next.slot]) as TDShape
    }

    return next
  })
}
