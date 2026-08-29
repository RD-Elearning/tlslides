/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-types */
import type {
  TLPage,
  TLUser,
  TLPageState,
  TLBinding,
  TLBoundsCorner,
  TLBoundsEdge,
  TLShape,
  TLHandle,
  TLSnapLine,
  TLPinchEventHandler,
  TLKeyboardEventHandler,
  TLPointerEventHandler,
  TLWheelEventHandler,
  TLCanvasEventHandler,
  TLBoundsEventHandler,
  TLBoundsHandleEventHandler,
  TLShapeBlurHandler,
  TLShapeCloneHandler,
  TLAsset,
} from '@tlslides/core'

/* -------------------------------------------------- */
/*                         App                        */
/* -------------------------------------------------- */

// A base class for all classes that handle events from the Renderer,
// including TDApp and all Tools.
export class TDEventHandler {
  onPinchStart?: TLPinchEventHandler
  onPinchEnd?: TLPinchEventHandler
  onPinch?: TLPinchEventHandler
  onKeyDown?: TLKeyboardEventHandler
  onKeyUp?: TLKeyboardEventHandler
  onPointerMove?: TLPointerEventHandler
  onPointerUp?: TLPointerEventHandler
  onPan?: TLWheelEventHandler
  onZoom?: TLWheelEventHandler
  onPointerDown?: TLPointerEventHandler
  onPointCanvas?: TLCanvasEventHandler
  onDoubleClickCanvas?: TLCanvasEventHandler
  onRightPointCanvas?: TLCanvasEventHandler
  onDragCanvas?: TLCanvasEventHandler
  onReleaseCanvas?: TLCanvasEventHandler
  onPointShape?: TLPointerEventHandler
  onDoubleClickShape?: TLPointerEventHandler
  onRightPointShape?: TLPointerEventHandler
  onDragShape?: TLPointerEventHandler
  onHoverShape?: TLPointerEventHandler
  onUnhoverShape?: TLPointerEventHandler
  onReleaseShape?: TLPointerEventHandler
  onPointBounds?: TLBoundsEventHandler
  onDoubleClickBounds?: TLBoundsEventHandler
  onRightPointBounds?: TLBoundsEventHandler
  onDragBounds?: TLBoundsEventHandler
  onHoverBounds?: TLBoundsEventHandler
  onUnhoverBounds?: TLBoundsEventHandler
  onReleaseBounds?: TLBoundsEventHandler
  onPointBoundsHandle?: TLBoundsHandleEventHandler
  onDoubleClickBoundsHandle?: TLBoundsHandleEventHandler
  onRightPointBoundsHandle?: TLBoundsHandleEventHandler
  onDragBoundsHandle?: TLBoundsHandleEventHandler
  onHoverBoundsHandle?: TLBoundsHandleEventHandler
  onUnhoverBoundsHandle?: TLBoundsHandleEventHandler
  onReleaseBoundsHandle?: TLBoundsHandleEventHandler
  onPointHandle?: TLPointerEventHandler
  onDoubleClickHandle?: TLPointerEventHandler
  onRightPointHandle?: TLPointerEventHandler
  onDragHandle?: TLPointerEventHandler
  onHoverHandle?: TLPointerEventHandler
  onUnhoverHandle?: TLPointerEventHandler
  onReleaseHandle?: TLPointerEventHandler
  onShapeBlur?: TLShapeBlurHandler
  onShapeClone?: TLShapeCloneHandler
}

// The shape of the TldrawApp's React (zustand) store
export interface TDSnapshot {
  settings: {
    isPresentationMode: boolean
    isCadSelectMode: boolean
    isDarkMode: boolean
    isDebugMode: boolean
    isPenMode: boolean
    isReadonlyMode: boolean
    isZoomSnap: boolean
    nudgeDistanceSmall: number
    nudgeDistanceLarge: number
    isFocusMode: boolean
    isSnapping: boolean
    showDeck: boolean
    showRotateHandles: boolean
    showBindingHandles: boolean
    showCloneHandles: boolean
    showGrid: boolean
    // Phase 16 — T16.6. An editor-wide preference (like `isDarkMode`), not a document field: a
    // slide transition is how *this viewer* is watching the deck, not a property of the deck
    // itself, and nothing here needs a schema migration this way. 'fade' is the default; 'push'
    // slides the incoming slide in from the direction of travel; 'none' cuts instantly.
    presentationTransition: 'fade' | 'push' | 'none'
  }
  appState: {
    currentStyle: ShapeStyles
    currentPageId: string
    hoveredId?: string
    activeTool: TDToolType
    isToolLocked: boolean
    isEmptyCanvas: boolean
    isMenuOpen: boolean
    status: string
    snapLines: TLSnapLine[]
    isLoading: boolean
    disableAssets: boolean
    selectByContain?: boolean
    // Phase 16 — T16.1. How many of the current slide's build steps (`computeBuildSteps`) are
    // revealed right now. Presentation-runtime state, deliberately not part of `TDDocument`: it
    // describes where a *viewing* of the deck currently is, not the deck's own content, so it
    // resets on every slide change (`TldrawApp.changePage`) and is never touched by undo/redo —
    // see `advancePresentation`/`previousPresentation` for the read/write side.
    presentationBuildStep: number
  }
  document: TDDocument
  room?: {
    id: string
    userId: string
    users: Record<string, TDUser>
  }
}

export type TldrawPatch = Patch<TDSnapshot>

export type TldrawCommand = Command<TDSnapshot>

// The shape of the files stored in JSON
export interface TDFile {
  name: string
  fileHandle: FileSystemHandle | null
  document: TDDocument
  assets: Record<string, unknown>
}

// The shape of the Tldraw document
export interface TDDocument {
  id: string
  name: string
  version: number
  pages: Record<string, TDPage>
  pageStates: Record<string, TLPageState>
  assets: TDAssets
  defaultPageSize?: number[]
  // Phase 12 — deck theme / brand kit. Optional, so a document that predates this field (every
  // document so far) simply has no `theme` and renders exactly as it does today — no migration,
  // no `TldrawApp.version` bump. Named `DeckTheme`, not `Theme`: `Theme` above is already taken by
  // the editor's own light/dark *UI* chrome palette, an unrelated concept this must not collide
  // with. See `state/shapes/shared/deck-theme.ts` for how a shape or background actually *uses*
  // this (the token-reference design) and `BUILT_IN_DECK_THEMES` for the shipped palettes.
  theme?: DeckTheme
}

/** One named brand palette. A shape or background never stores one of these hex values directly —
 *  it stores a sentinel token string (`'theme:accent1'`, see `deck-theme.ts`) that resolves against
 *  whichever `DeckTheme` is active, so switching `TDDocument.theme` restyles every shape/background
 *  that references a token in one move. */
export interface DeckThemeColors {
  background: string
  surface: string
  text: string
  textMuted: string
  accent1: string
  accent2: string
}

// Phase 12 — deck theme / brand kit. `fonts` is a *pairing*: `heading`/`body` each pick one of
// this fork's four bundled `FontStyle` faces, so a theme with no family override still renders
// with zero font-loading risk (the four faces ship with the package). `shapeDefaults` is applied
// once, at template-instantiation time (`addSlideFromTemplate`), as the base a template shape's
// own style patches on top of — it is deliberately NOT re-applied to already-placed shapes on a
// later theme switch (unlike the colour tokens), because a "default" is a starting point for new
// content, not a live constraint on existing content; see the Phase 12 report for the full
// reasoning.
//
// Phase 17 — `headingFamily`/`bodyFamily` are optional, arbitrary-CSS-font-family overrides paired
// with `heading`/`body`, the same "an enum for the safe built-in case, plus an optional string for
// an absolute override" shape `ShapeStyles.font`/`fontFamily` already uses (see that field's
// comment in this same file for the full honesty story on where an arbitrary family comes from and
// what happens when it hasn't loaded). None of the five built-in themes below set them — every
// shipped theme stays dependency-free — but a host's own brand kit can now pin a real logo/brand
// typeface without abandoning the enum pairing entirely: `heading`/`body` still drive the
// `FontStyle`-keyed size modifier and the `estimateTextSize` metrics table, so even a theme with a
// custom `headingFamily` degrades to a sane bundled face's metrics rather than an unmeasured guess
// alone. Resolved by `resolveFont` (`state/shapes/shared/shape-styles.ts`), the one function that
// turns a shape's `fontToken` plus the active theme into an actual CSS font-family value.
export interface DeckTheme {
  id: string
  name: string
  colors: DeckThemeColors
  fonts: {
    heading: FontStyle
    body: FontStyle
    headingFamily?: string
    bodyFamily?: string
  }
  shapeDefaults?: Partial<ShapeStyles>
}

// The shape of a single page in the Tldraw document
export interface TDPage extends TLPage<TDShape, TDBinding> {
  size?: number[] // [width, height] of the slide frame
  // Phase 11 — widened from a reserved, never-rendered `string` to a structured union. No
  // migration and no `TldrawApp.version` bump: every document that predates this field simply
  // lacks a `background` (the old field was reserved and nothing ever wrote or read it — verified
  // before this phase), and the one shape it *could* have taken, a bare string, still parses: see
  // `resolveSlideBackground`, which treats it as `{ type: 'solid', color: <string> }`.
  background?: SlideBackground | string
  notes?: string // speaker notes
  skipInPresentation?: boolean // skip this slide when presenting
}

/** One color stop in a gradient. `at` is 0–1 along the gradient, matching SVG's `<stop offset>`
 *  and CSS gradient stop percentages (just expressed as a fraction instead of a percentage).
 *  `color`, like `SlideBackground`'s `solid.color` and `ShapeStyles.stroke`/`fill` below, may be a
 *  literal hex OR a Phase 12 theme token (`'theme:accent1'`) — see `deck-theme.ts`. */
export interface TDGradientStop {
  color: string
  at: number
}

// Phase 11 — background system. Multi-stop, arbitrary-angle linear gradients are the headline
// feature; radial gradients and image backgrounds share the same shape of data so the whole union
// resolves through one function (`resolveSlideBackground`, in
// `state/shapes/shared/background.ts`) into the generic paint spec `@tlslides/core`'s `Frame`
// actually renders. See that module for the angle convention and the SVG-vs-CSS gradient decision.
// Phase 12: every `color` string below (the solid case, and each gradient stop's `color`) may
// also be a theme token — see `TDGradientStop`'s comment and `deck-theme.ts`.
export type SlideBackground =
  | { type: 'solid'; color: string }
  | { type: 'linearGradient'; angle: number; stops: TDGradientStop[] }
  | { type: 'radialGradient'; cx: number; cy: number; stops: TDGradientStop[] }
  | { type: 'image'; assetId: string; fit: 'cover' | 'contain' | 'tile'; opacity?: number }

// The subset of `SlideBackground` that also makes sense as a *shape* fill (T11.3): a shape has no
// use for 'solid' (that's just `style.fill`) or 'image' (not asked for on shapes in this phase),
// but the gradient variants are shared verbatim with the page background so one angle convention,
// one resolver shape, and one preset list serve both.
export type ShapeGradientFill = Extract<SlideBackground, { type: 'linearGradient' | 'radialGradient' }>

// A partial of a TDPage, used for commands / patches
export type PagePartial = {
  shapes: Patch<TDPage['shapes']>
  bindings: Patch<TDPage['bindings']>
}

// The meta information passed to TDShapeUtil components
export interface TDMeta {
  isDarkMode: boolean
  // Phase 12 — threaded alongside `isDarkMode` (the closest existing precedent: a per-document
  // render concern every shape util already receives via `meta`) rather than read from a global,
  // so a shape component's colour resolution stays a pure function of its own props/meta, the same
  // discipline `isDarkMode` already follows. See `getShapeStyle`'s `deckTheme` parameter.
  deckTheme?: DeckTheme
}

// The type of info given to shapes when transforming
export interface TransformInfo<T extends TLShape> {
  type: TLBoundsEdge | TLBoundsCorner
  initialShape: T
  scaleX: number
  scaleY: number
  transformOrigin: number[]
}

// The status of a TDUser
export enum TDUserStatus {
  Idle = 'idle',
  Connecting = 'connecting',
  Connected = 'connected',
  Disconnected = 'disconnected',
}

// A TDUser, for multiplayer rooms
export interface TDUser extends TLUser<TDShape> {
  activeShapes: TDShape[]
  status: TDUserStatus
}

export type Theme = 'dark' | 'light'

export enum SessionType {
  Transform = 'transform',
  Translate = 'translate',
  TransformSingle = 'transformSingle',
  Brush = 'brush',
  Arrow = 'arrow',
  Draw = 'draw',
  Erase = 'erase',
  Rotate = 'rotate',
  Handle = 'handle',
  Grid = 'grid',
}

export enum TDStatus {
  Idle = 'idle',
  PointingHandle = 'pointingHandle',
  PointingBounds = 'pointingBounds',
  PointingBoundsHandle = 'pointingBoundsHandle',
  TranslatingLabel = 'translatingLabel',
  TranslatingHandle = 'translatingHandle',
  Translating = 'translating',
  Transforming = 'transforming',
  Rotating = 'rotating',
  Pinching = 'pinching',
  Brushing = 'brushing',
  Creating = 'creating',
  EditingText = 'editing-text',
}

export type TDToolType =
  | 'select'
  | 'erase'
  | TDShapeType.Text
  | TDShapeType.Draw
  | TDShapeType.Ellipse
  | TDShapeType.Rectangle
  | TDShapeType.Triangle
  | TDShapeType.Line
  | TDShapeType.Arrow
  | TDShapeType.Sticky

export type Easing =
  | 'linear'
  | 'easeInQuad'
  | 'easeOutQuad'
  | 'easeInOutQuad'
  | 'easeInCubic'
  | 'easeOutCubic'
  | 'easeInOutCubic'
  | 'easeInQuart'
  | 'easeOutQuart'
  | 'easeInOutQuart'
  | 'easeInQuint'
  | 'easeOutQuint'
  | 'easeInOutQuint'
  | 'easeInSine'
  | 'easeOutSine'
  | 'easeInOutSine'
  | 'easeInExpo'
  | 'easeOutExpo'
  | 'easeInOutExpo'

export enum MoveType {
  Backward = 'backward',
  Forward = 'forward',
  ToFront = 'toFront',
  ToBack = 'toBack',
}

export enum AlignType {
  Top = 'top',
  CenterVertical = 'centerVertical',
  Bottom = 'bottom',
  Left = 'left',
  CenterHorizontal = 'centerHorizontal',
  Right = 'right',
}

export enum StretchType {
  Horizontal = 'horizontal',
  Vertical = 'vertical',
}

export enum DistributeType {
  Horizontal = 'horizontal',
  Vertical = 'vertical',
}

export enum FlipType {
  Horizontal = 'horizontal',
  Vertical = 'vertical',
}

/* -------------------------------------------------- */
/*                       Shapes                       */
/* -------------------------------------------------- */

export enum TDShapeType {
  Sticky = 'sticky',
  Ellipse = 'ellipse',
  Rectangle = 'rectangle',
  Triangle = 'triangle',
  Draw = 'draw',
  Arrow = 'arrow',
  Line = 'line',
  Text = 'text',
  Group = 'group',
  Image = 'image',
  Video = 'video',
  Component = 'component',
}

export enum Decoration {
  Arrow = 'arrow',
}

export interface TDBaseShape extends TLShape {
  style: ShapeStyles
  type: TDShapeType
  label?: string
  handles?: Record<string, TDHandle>
  animation?: ShapeAnimation
  // Phase 13 — templates. Names this shape as a fillable placeholder within a `Template` (e.g.
  // 'title', 'body', 'image'): `TldrawApp.addSlideFromTemplate`'s `content` argument maps a slot
  // name to a replacement value, so a user, a bulk import, or later the AI pipeline can all fill a
  // template the same way, through the same field. Optional and otherwise inert — a shape with no
  // `slot` behaves exactly as it does today — so this needs no migration. See `state/templates.ts`.
  slot?: string
}

// Per-shape build animation, driven from presentation mode (F-06)
export enum AnimationEffect {
  FadeIn = 'fadeIn',
  SlideIn = 'slideIn',
  ZoomIn = 'zoomIn',
  Wipe = 'wipe',
}

export enum AnimationTrigger {
  OnClick = 'onClick',
  WithPrevious = 'withPrevious',
  AfterPrevious = 'afterPrevious',
}

export interface ShapeAnimation {
  effect: AnimationEffect
  trigger: AnimationTrigger
  order: number // build order within the slide
  durationMs: number
  delayMs: number
}

export interface DrawShape extends TDBaseShape {
  type: TDShapeType.Draw
  points: number[][]
  isComplete: boolean
}

// The extended handle (used for arrows)
export interface TDHandle extends TLHandle {
  canBind?: boolean
  bindingId?: string
}

export interface RectangleShape extends TDBaseShape {
  type: TDShapeType.Rectangle
  size: number[]
  label?: string
  labelPoint?: number[]
}

export interface EllipseShape extends TDBaseShape {
  type: TDShapeType.Ellipse
  radius: number[]
  label?: string
  labelPoint?: number[]
}

export interface TriangleShape extends TDBaseShape {
  type: TDShapeType.Triangle
  size: number[]
  label?: string
  labelPoint?: number[]
}

// The shape created with the arrow tool
export interface ArrowShape extends TDBaseShape {
  type: TDShapeType.Arrow
  bend: number
  handles: {
    start: TDHandle
    bend: TDHandle
    end: TDHandle
  }
  decorations?: {
    start?: Decoration
    end?: Decoration
    middle?: Decoration
  }
  label?: string
  labelPoint?: number[]
}

// A straight two-point line. Unlike ArrowShape it has no bend handle, no decorations
// (arrowheads), no label, and cannot bind to or be bound from other shapes.
export interface LineShape extends TDBaseShape {
  type: TDShapeType.Line
  handles: {
    start: TDHandle
    end: TDHandle
  }
}

export interface ArrowBinding extends TLBinding {
  handleId: keyof ArrowShape['handles']
  distance: number
  point: number[]
}

export type TDBinding = ArrowBinding

export interface ImageShape extends TDBaseShape {
  type: TDShapeType.Image
  size: number[]
  assetId: string
  alt?: string
}

export interface VideoShape extends TDBaseShape {
  type: TDShapeType.Video
  size: number[]
  assetId: string
  isPlaying: boolean
  currentTime: number
  alt?: string
}

// A shape that renders a host-app-registered React component (F-02). Only a serializable
// `componentId` and `props` bag live in the document — the actual React component is supplied at
// runtime via the `components` prop on <Tldraw>, so the document stays plain JSON and survives
// persistence, .tldr files, and multiplayer sync unchanged. See reviews/04-custom-component-blocks.md.
export interface ComponentShape extends TDBaseShape {
  type: TDShapeType.Component
  size: number[]
  componentId: string
  props: Record<string, unknown>
}

// The shape created by the text tool
export interface TextShape extends TDBaseShape {
  type: TDShapeType.Text
  text: string
}

// The shape created by the sticky tool
export interface StickyShape extends TDBaseShape {
  type: TDShapeType.Sticky
  size: number[]
  text: string
}

// The shape created when multiple shapes are grouped
export interface GroupShape extends TDBaseShape {
  type: TDShapeType.Group
  size: number[]
  children: string[]
}

// A union of all shapes
export type TDShape =
  | RectangleShape
  | EllipseShape
  | TriangleShape
  | DrawShape
  | ArrowShape
  | LineShape
  | TextShape
  | GroupShape
  | StickyShape
  | ImageShape
  | VideoShape
  | ComponentShape

/* ------------------ Shape Styles ------------------ */

export enum ColorStyle {
  White = 'white',
  LightGray = 'lightGray',
  Gray = 'gray',
  Black = 'black',
  Green = 'green',
  Cyan = 'cyan',
  Blue = 'blue',
  Indigo = 'indigo',
  Violet = 'violet',
  Red = 'red',
  Orange = 'orange',
  Yellow = 'yellow',
}

export enum SizeStyle {
  Small = 'small',
  Medium = 'medium',
  Large = 'large',
}

export enum DashStyle {
  Draw = 'draw',
  Solid = 'solid',
  Dashed = 'dashed',
  Dotted = 'dotted',
}

export enum FontSize {
  Small = 'small',
  Medium = 'medium',
  Large = 'large',
  ExtraLarge = 'extraLarge',
}

export enum AlignStyle {
  Start = 'start',
  Middle = 'middle',
  End = 'end',
  Justify = 'justify',
}

export enum FontStyle {
  Script = 'script',
  Sans = 'sans',
  Serif = 'serif',
  Mono = 'mono',
}

export type ShapeStyles = {
  color: ColorStyle
  size: SizeStyle
  dash: DashStyle
  font?: FontStyle
  textAlign?: AlignStyle
  isFilled?: boolean
  scale?: number
  // Phase 8a — style expressiveness. All three are optional overrides: a document (or a shape)
  // that lacks them falls back to today's behavior (fully opaque, size-enum-derived stroke width,
  // the existing hardcoded corner radius), so no migration is needed for document version 16.
  /** 0–1. Undefined means fully opaque, matching every shape drawn before this field existed. */
  opacity?: number
  /** Pixel width. When set, overrides the width derived from `size`. */
  strokeWidth?: number
  /** Pixel radius, currently consumed by Rectangle and ComponentShape only. */
  cornerRadius?: number
  // Phase 8b — arbitrary hex colour. `color` stays the `ColorStyle` enum (and keeps resolving
  // through the theme-dependent `strokes`/`fills` palettes in shape-styles.ts) so every existing
  // document keeps rendering exactly as before. `stroke`/`fill` are optional absolute overrides —
  // named after the two keys `getShapeStyle` already returns, since that's exactly what they
  // replace. Two independent fields, not one "color" override, because the enum itself already
  // resolves to two independent palette lookups (`strokes[color]` vs `fills[color]`, different
  // lightness per theme) — a brand kit needs the same independence to pin an exact stroke hex and
  // an exact fill hex separately. **Deliberately theme-invariant**: unlike the enum, which flips
  // with `isDarkMode` (see the `strokes`/`fills` tables), a hex the user typed in is an absolute
  // value and must render identically in both UI themes — see `getShapeStyle`'s comment for where
  // this is enforced. This is a first, narrow step against the open issue (flagged in
  // reviews/README.md, Phase 4 notes) that shape colours flip with the *UI* theme rather than
  // being a property of the slide.
  /** Absolute hex override for stroke colour (and, on shapes without a separate fill, text/line
   *  colour too, since they all read `getShapeStyle().stroke`). Undefined falls back to the
   *  `color` enum, exactly as before this field existed.
   *  Phase 12: this string may also be a theme token (`'theme:accent1'`, one of the keys of
   *  `DeckThemeColors`) instead of a literal hex — same field, no type change, no migration. See
   *  `resolveThemeColor` in `deck-theme.ts` for the one place that distinguishes the two. */
  stroke?: string
  /** Absolute hex override for fill colour. Only takes effect when `isFilled` is true, mirroring
   *  how the resolved `fill` value already works. Undefined falls back to the `color` enum. May
   *  also be a theme token — see `stroke` above. */
  fill?: string
  // Phase 11 — gradient fill. Only takes effect when `isFilled` is true, same guard as `fill`.
  // Coherence rule (same precedent as size/strokeWidth and color/stroke/fill in Phase 8b): a
  // gradient is the *more specific* control, so setting one clears `fill` in the same
  // `app.style()` call, and picking a flat fill (swatch or hex) clears `fillGradient` — see
  // `getShapeStyle` for the resolution order and BackgroundMenu/StyleMenu for the call sites that
  // enforce it. Currently consumed by RectangleUtil and EllipseUtil only (see the Phase 11
  // report for what was left out of scope).
  fillGradient?: ShapeGradientFill
  // ---------------------------------------------------------------------------------------------
  // Phase 17 — typography. All five fields below are optional overrides with a today's-behaviour
  // fallback (undefined = exactly what every document rendered before this phase), so no
  // migration and no `TldrawApp.version` bump — the same discipline Phase 8a established for
  // opacity/strokeWidth/cornerRadius. See `guides/documentation.md` and the Phase 17 report
  // (`reviews/README.md`) for the full design rationale, especially the arbitrary-font-family
  // honesty story and what does/doesn't survive `renderPageToSvg`.
  /** Line spacing, as a multiplier of font size. Undefined means the pre-Phase-17 hardcoded
   *  default — `1` for the live CSS `line-height` (TextUtil/TextLabel/StickyUtil), `LINE_HEIGHT`
   *  (1.3) for the SVG baseline-to-baseline spacing (`getTextSvgElement`/`renderPageToSvg`). Those
   *  two defaults already differed before this field existed (a CSS line-height and an SVG
   *  baseline multiple are different conventions); this field feeds the same number into each
   *  pipeline's own convention rather than trying to unify them. */
  lineHeight?: number
  /** Letter spacing, in em (a bare number, not a CSS length string — see `getLetterSpacingEm`'s
   *  comment for why a free-typed CSS unit was rejected). Undefined means the pre-existing
   *  hardcoded `LETTER_SPACING` constant (`-0.03em`), which — as of this phase — is now also
   *  applied to the SVG `letter-spacing` attribute and to `StickyShape`'s live CSS, closing two
   *  small pre-existing live/export and Text-vs-Sticky gaps as a side effect of making the value
   *  itself overridable (see the Phase 17 report). */
  letterSpacing?: number
  /** Vertical position of a shape *label* (Rectangle/Ellipse/Triangle/Arrow — anything rendered
   *  via `TextLabel`) within its box. Reuses `AlignStyle` rather than a new two/three-value union
   *  — `Start`/`Middle`/`End` already mean exactly "top/center/bottom" read on the cross axis;
   *  `Justify` is meaningless vertically and is treated the same as `Start` wherever this is
   *  consumed. Undefined means the pre-existing hardcoded center. **No effect on a bare
   *  `TextShape`**: unlike a label, a bare text shape's box IS its measured text (`TextUtil.
   *  getBounds`), so there is no independent "box" to align within — see the Phase 17 report. */
  verticalAlign?: AlignStyle
  /** Bullet or numbered list markers, one line (`\n`-split) at a time. **`TextShape` only** — see
   *  the Phase 17 report for why shape labels and `StickyShape` are an explicit, named scope cut
   *  rather than a silent gap. The marker is prepended to the *rendered* line only; the raw
   *  textarea value a user edits is never rewritten, so undo/redo and copy/paste keep operating on
   *  plain text — see `applyListMarkers` (`shared/textList.ts`), the one place this is computed,
   *  for the exact marker strings. */
  list?: TextListStyle
  /** An arbitrary CSS `font-family` value (ideally a full stack with a generic fallback, e.g.
   *  `'"Poppins", sans-serif'`), trusted verbatim and used in place of the bundled face `font`
   *  would otherwise resolve to. The **more specific** control, so it wins over both `fontToken`
   *  and `font` when set (same "more specific wins" precedent as `stroke`/`fill` overriding
   *  `color`, and `fillGradient` overriding `fill`) — see `resolveFont` in `shape-styles.ts`, the
   *  one place this is resolved, for the full honesty story: this fork does not fetch, bundle, or
   *  verify that the named family is ever actually loaded. A host wiring this up owns making the
   *  family available (a `<link>` to Google Fonts, a self-hosted `@font-face`, or a name it knows
   *  the browser already has) exactly as it would for any other web page. */
  fontFamily?: string
  /** A reference to the active `DeckTheme`'s heading/body font pairing, mirroring the `'theme:*'`
   *  colour token design (`resolveThemeColor` in `deck-theme.ts`) but as its own field rather than
   *  a sentinel string prefix — `font` is a `FontStyle` enum, not a `string`, so it can't hold a
   *  `'theme:heading'`-style token itself without widening its type for every existing reader.
   *  Resolved by `resolveFont`, which — per the "more specific wins" rule above — only consults
   *  this when `fontFamily` is unset, and only when a `DeckTheme` is actually active; otherwise it
   *  falls back to `font` exactly as if this had never been set. `buildTemplateShapes`
   *  (`state/templates.ts`) sets this instead of baking `style.font`, which is what makes a theme
   *  switch restyle a template's typography, not just its colours — closing the follow-up recorded
   *  in `reviews/roadmap-slides.md` after Phase 12. Not currently exposed as a user-facing "bind to
   *  theme" control in `StyleMenu` — see the Phase 17 report for that scope cut. */
  fontToken?: 'heading' | 'body'
  /** Shrink (never grow) a shape *label*'s effective font scale so it fits inside the shape's own
   *  box, recomputed from current text/box/font on every relevant change rather than stored as a
   *  fixed number. **Shape labels only** (Rectangle/Ellipse/Triangle — not Arrow, which already has
   *  its own independent auto-shrink-to-arrow-length behaviour; not `StickyShape`, whose box
   *  already auto-*grows* to fit its text, the opposite philosophy; not a bare `TextShape`, which
   *  has no independent box at all). The **more specific** control: while `true`, this overrides
   *  `scale`'s effect entirely rather than compounding with it — see `computeAutoFitScale` in
   *  `shape-styles.ts`, the one place the fit ratio is computed, consumed identically (given each
   *  environment's own idea of "natural" text size) by the live editor and by `renderPageToSvg`. */
  autoFit?: boolean
}

/** The two list-marker styles `TextShape.style.list` supports — see that field's own comment. */
export type TextListStyle = 'bullet' | 'number'

export enum TDAssetType {
  Image = 'image',
  Video = 'video',
}

export interface TDImageAsset extends TLAsset {
  type: TDAssetType.Image
  src: string
  size: number[]
}

export interface TDVideoAsset extends TLAsset {
  type: TDAssetType.Video
  src: string
  size: number[]
}

export type TDAsset = TDImageAsset | TDVideoAsset

export type TDAssets = Record<string, TDAsset>

/* -------------------------------------------------- */
/*                   Insert content                   */
/* -------------------------------------------------- */

// A bundle of shapes (and the bindings/assets they reference) to add to the current page in one
// go, e.g. from the clipboard, a template (F-05), or AI-generated slide content. Ids are
// remapped on insertion — see `TldrawApp.insertContent` — so the same content can be inserted
// more than once without colliding with itself or with the document.
export interface TDInsertableContent {
  shapes: TDShape[]
  bindings?: TDBinding[]
  assets?: TDAsset[]
}

export interface TDInsertContentOpts {
  /**
   * Where to place the center of the content's bounding box, in page space. Ignored when
   * `center` is `false`. Defaults to the center of the current viewport.
   */
  point?: number[]
  /** Whether to select the inserted shapes afterward. Defaults to `true`. */
  select?: boolean
  /**
   * Whether to reposition the content at all. When `false`, shapes are inserted at their own
   * authored coordinates and `point` is ignored — use this for templates, whose slot positions
   * are meaningful relative to the slide frame. Defaults to `true`.
   */
  center?: boolean
  /**
   * Which slide to insert into. Defaults to the current slide. Phase 14 — lets a host target a
   * slide that isn't currently open (e.g. `Deck.insertContent`/`Deck.addBlock`) without an extra
   * `changePage` call, which would both move the user's viewport and cost a second undo step.
   * Note: `center: true` (the default) centers against *this page's own stored camera*, which is
   * only meaningful if the page is, or recently was, the current one — pass an explicit `point`,
   * or `center: false` with the content's own authored coordinates, when targeting a slide the
   * user isn't looking at.
   */
  pageId?: string
}

/* -------------------------------------------------- */
/*                      Templates                      */
/* -------------------------------------------------- */

// Phase 13 — template system. A template is plain, serializable JSON: no code, no closures, no
// class instances — every field here is a string, number, or a `TDShape` (itself plain data), so
// a whole template round-trips through `JSON.parse(JSON.stringify(...))` unchanged (enforced in
// `templates.spec.ts`). That's deliberate, not incidental: it's what lets a template be authored,
// stored, and fetched by a host app later, exactly like `TDInsertableContent` above.
//
// Shapes reference theme tokens (`'theme:accent1'`, see `deck-theme.ts`), not literal hex, so the
// starter pack is `layouts × themes`, not a dozen fixed-color pictures — switching the active
// `DeckTheme` restyles a slide built from a template the same way it restyles anything else.
//
// A fillable shape carries `slot` (see `TDBaseShape.slot`); `TldrawApp.addSlideFromTemplate`'s
// `content` argument maps a slot name to its replacement text.
export interface Template {
  id: string
  name: string
  /** [width, height] of the slide this template produces — usually `DEFAULT_SLIDE_SIZE`, but a
   *  template is free to target a different aspect ratio. */
  size: number[]
  /** Same shape as `TDPage.background` — may itself hold theme tokens (see `SlideBackground`). */
  background?: SlideBackground
  shapes: TDShape[]
}

/* -------------------------------------------------- */
/*                    Export                          */
/* -------------------------------------------------- */

export enum TDExportTypes {
  PNG = 'png',
  JPG = 'jpeg',
  WEBP = 'webp',
  PDF = 'pdf',
  SVG = 'svg',
  JSON = 'json',
}

export interface TDExport {
  currentPageId: string
  name: string
  shapes: TDShape[]
  assets: TDAssets
  type: TDExportTypes
  size: number[]
  serialized?: string
}

/* -------------------------------------------------- */
/*                    Type Helpers                    */
/* -------------------------------------------------- */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ParametersExceptFirst<F> = F extends (arg0: any, ...rest: infer R) => any ? R : never

export type ExceptFirst<T extends unknown[]> = T extends [any, ...infer U] ? U : never

export type ExceptFirstTwo<T extends unknown[]> = T extends [any, any, ...infer U] ? U : never

export type PropsOfType<U> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [K in keyof TDShape]: TDShape[K] extends any ? (TDShape[K] extends U ? K : never) : never
}[keyof TDShape]

export type Difference<A, B, C = A> = A extends B ? never : C

export type Intersection<A, B, C = A> = A extends B ? C : never

export type FilteredKeys<T, U> = {
  [P in keyof T]: T[P] extends U ? P : never
}[keyof T]

export type RequiredKeys<T> = {
  [K in keyof T]-?: Difference<Record<string, unknown>, Pick<T, K>, K>
}[keyof T]

export type MembersWithRequiredKey<T, U> = {
  [P in keyof T]: Intersection<U, RequiredKeys<T[P]>, T[P]>
}[keyof T]

export type MappedByType<U extends string, T extends { type: U }> = {
  [P in T['type']]: T extends any ? (P extends T['type'] ? T : never) : never
}

export type ShapesWithProp<U> = MembersWithRequiredKey<MappedByType<TDShapeType, TDShape>, U>

// `T extends object` stops the recursion at primitives (string, number, boolean, enums) AND at
// `unknown`/`any` (neither of which extends `object`). Without this guard, `Patch<unknown>` used
// to expand to `Partial<{ [P in keyof unknown]: ... }>`, and since `keyof unknown` is `never`,
// that collapsed to `{}` — a type `unknown` is not assignable to. That made
// `Patch<Record<string, unknown>>` (needed for `ComponentShape['props']`, which is intentionally
// untyped per-block data) unusable: no value could ever satisfy it. Stopping at `unknown`/`any`
// leaves the property typed `unknown`, which round-trips correctly.
//
// Gating at the top like this (rather than gating each `T[P]` inside a plain, ungated
// `Partial<{ [P in keyof T] : ... }>`) matters for a second reason: `T extends X ? A : B` with a
// *naked* generic `T` as the checked type distributes over unions, so `Patch<TDShape>` correctly
// expands to a union of each shape variant's own patch shape (preserving the `type` discriminant
// per branch) instead of collapsing `TDShape`'s members down to their common keys the way a
// mapped type over a union does. `StateManager.replaceState` passing a concrete `T` where
// `Patch<T>` is expected relies on this distribution too; the one place it does not fall out for
// free is an unresolved *generic* `T` (see the cast in `StateManager.patchState`).
export type Patch<T> = T extends object ? Partial<{ [P in keyof T]: Patch<T[P]> }> : T

export interface Command<T extends { [key: string]: any }> {
  id?: string
  before: Patch<T>
  after: Patch<T>
}

export interface FileWithHandle extends File {
  handle?: FileSystemHandle
}

export interface FileWithDirectoryHandle extends File {
  directoryHandle?: FileSystemHandle
}

// The following typings implement the relevant parts of the File System Access
// API. This can be removed once the specification reaches the Candidate phase
// and is implemented as part of microsoft/TSJS-lib-generator.

export interface FileSystemHandlePermissionDescriptor {
  mode?: 'read' | 'readwrite'
}

export interface FileSystemHandle {
  readonly kind: 'file' | 'directory'
  readonly name: string

  isSameEntry: (other: FileSystemHandle) => Promise<boolean>

  queryPermission: (descriptor?: FileSystemHandlePermissionDescriptor) => Promise<PermissionState>
  requestPermission: (descriptor?: FileSystemHandlePermissionDescriptor) => Promise<PermissionState>
}
