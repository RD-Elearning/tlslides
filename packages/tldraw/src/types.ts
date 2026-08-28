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
}

// The shape of a single page in the Tldraw document
export interface TDPage extends TLPage<TDShape, TDBinding> {
  size?: number[] // [width, height] of the slide frame
  background?: string // slide background fill
  notes?: string // speaker notes
  skipInPresentation?: boolean // skip this slide when presenting
}

// A partial of a TDPage, used for commands / patches
export type PagePartial = {
  shapes: Patch<TDPage['shapes']>
  bindings: Patch<TDPage['bindings']>
}

// The meta information passed to TDShapeUtil components
export interface TDMeta {
  isDarkMode: boolean
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
}

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
