import type { DeckTheme, DeckThemeColors } from '~types'
import { FontStyle } from '~types'

// ---------------------------------------------------------------------------------------------
// T12.1 — the token-reference design
// ---------------------------------------------------------------------------------------------
// The problem: a shape whose `style.fill` is the literal `'#43CEA2'` can never be restyled by
// switching decks theme — the hex is baked in. A template library that hard-codes hex is
// therefore worthless the moment you want more than one look.
//
// The fix picked here is a *sentinel string*, not a new field: `style.stroke`/`style.fill`,
// `TDGradientStop.color`, and `SlideBackground`'s solid `color` are all already plain `string`
// (Phase 8b/11). A theme token is just one more string those same fields can hold —
// `'theme:accent1'` — recognized by a `theme:` prefix and resolved against whichever `DeckTheme`
// is active. Three things this buys, all load-bearing:
//
// 1. **No schema change, no migration.** Every one of those fields already accepts an arbitrary
//    string; a document written before this phase existed simply never has one that starts with
//    `theme:`, so nothing about reading or writing them changes shape.
// 2. **Survives SVG export for free.** Export never has to know what a token *is* — it clones the
//    live DOM node (`TDShapeUtil.getSvgElement`'s `cloneNode`) or calls the exact same resolver
//    the live renderer used (background export, the text-label export path). By the time either
//    path runs, `resolveThemeColor` has already turned `'theme:accent1'` into `'#38BDF8'`; nothing
//    downstream ever sees the token string itself. Same reasoning Phase 11 already established for
//    gradients: resolve once, in one function, before anything paints or exports.
// 3. **Works in Deck thumbnails for free.** A thumbnail is just another `<Frame>` render of the
//    same document (see Phase 11 notes) — it calls the exact same `getShapeStyle`/
//    `resolveSlideBackground` this phase updates, with the same `document.theme`, so a thumbnail
//    never needs its own theme-resolution path.
//
// The alternative considered and rejected: a separate `fillToken?: string` field alongside `fill`.
// That would need its own coherence rule (which one wins when both are set — a fourth version of
// the same "more specific control wins" dance Phase 8a/8b/11 already do three times), a distinct
// code path through every one of the ~20 `getShapeStyle` call sites, and a second migration-free
// optional field to explain. A sentinel string needs none of that: it reuses the exact field, the
// exact resolution call site, and the exact fallback behaviour (see below) the hex override
// already has.
//
// Resolution happens in exactly one place: this function. Every caller — `getShapeStyle` (shape
// stroke/fill), `background.ts`'s `toSvgStops`/`resolveSlideBackground` (page background, shape
// gradient stops) — calls through here, never re-implements the `theme:` prefix check.
const TOKEN_PREFIX = 'theme:'

/**
 * Resolve one colour field's stored value against the active `DeckTheme`.
 *
 * - `undefined` in, `undefined` out — the field was never set; callers fall back to whatever they
 *   fell back to before this phase existed (the `color` enum palette, a hardcoded default, etc).
 * - A plain hex (or any string not starting with `theme:`) passes through unchanged — this is the
 *   Phase 8b/11 behaviour, untouched.
 * - A token (`'theme:accent1'`) resolves to `theme.colors.accent1` when a theme is active and the
 *   key is one `DeckThemeColors` actually has. **Degrades to `undefined` — not a hardcoded
 *   fallback colour — when there's no active theme, or the key is unknown** (a stale token from a
 *   deck whose theme was later simplified, or a typo). That is deliberate: every call site already
 *   has a real, sensible `?? enum` / `?? default` fallback for "this field wasn't set", so an
 *   unresolvable token quietly takes that same path instead of painting a jarring warning colour
 *   or crashing on a bad SVG paint value. A theme-less document therefore renders a
 *   template-derived shape exactly as if the token had never been written.
 */
export function resolveThemeColor(
  value: string | undefined,
  theme: DeckTheme | undefined
): string | undefined {
  if (value === undefined || !value.startsWith(TOKEN_PREFIX)) return value
  const key = value.slice(TOKEN_PREFIX.length) as keyof DeckThemeColors
  return theme?.colors[key]
}

/** Build a theme token string for a given colour slot — the write side of `resolveThemeColor`,
 *  used by the built-in templates below and available to anything else constructing theme-aware
 *  content (a host's own template author, a future AI pipeline). */
export function themeToken(key: keyof DeckThemeColors): string {
  return `${TOKEN_PREFIX}${key}`
}

export function isThemeToken(value: string | undefined): boolean {
  return value !== undefined && value.startsWith(TOKEN_PREFIX)
}

// ---------------------------------------------------------------------------------------------
// Built-in themes (T12.4)
// ---------------------------------------------------------------------------------------------
// Five real, designer-considered palettes — a light/dark spread, a serif editorial look, a
// vibrant consumer look, and a monochrome-plus-one-accent look — each with genuine text/background
// contrast and a heading/body font pairing drawn from this fork's four bundled `FontStyle` faces.
// None sets `fonts.headingFamily`/`bodyFamily` (Phase 17's arbitrary-font-family override, resolved
// by `resolveFont` in `shape-styles.ts`) — every shipped theme stays dependency-free by design; see
// that field's comment on `DeckTheme` (`~types`) for a host's own brand kit wiring one up.
// `shapeDefaults` is intentionally light-touch: a rounded corner and a filled default so a freshly
// theme-instantiated panel doesn't need every template to repeat the same two style fields.
// Phase 19 — `positive`/`negative`/`warning` per built-in theme (doc `reviews/blocks/
// 02-design-language.md` §2.2). Picked per palette, not as one shared green/red/amber: a
// brighter, more saturated family reads on `midnight`'s dark surfaces; the same hues would look
// garish against `ivory-editorial`'s warm cream, so that theme gets deeper, muted tones instead.
// Where a theme's own `accent2` already sits in the red or green family (`mono-grid`'s red,
// `forest`'s green-ish `accent1`), the status colour is still a distinct hex — close in family
// is fine (both read as "that kind of colour" to a viewer), identical is not (it would make the
// brand accent and a semantic status colour indistinguishable in the laid-out node tree, which
// is exactly the "positive/negative reserved for real polarity" rule this doc section polices).
export const BUILT_IN_DECK_THEMES: DeckTheme[] = [
  {
    id: 'midnight',
    name: 'Midnight',
    colors: {
      background: '#0F172A',
      surface: '#1E293B',
      text: '#F8FAFC',
      textMuted: '#94A3B8',
      accent1: '#38BDF8',
      accent2: '#F472B6',
      positive: '#34D399',
      negative: '#F87171',
      warning: '#FBBF24',
    },
    fonts: { heading: FontStyle.Sans, body: FontStyle.Sans },
    shapeDefaults: { isFilled: true, cornerRadius: 24 },
  },
  {
    id: 'ivory-editorial',
    name: 'Ivory Editorial',
    colors: {
      background: '#FDFBF7',
      surface: '#F1EDE4',
      text: '#1F2937',
      textMuted: '#6B7280',
      accent1: '#B45309',
      accent2: '#065F46',
      positive: '#3F7D58',
      negative: '#A3342A',
      warning: '#C08A17',
    },
    fonts: { heading: FontStyle.Serif, body: FontStyle.Sans },
    shapeDefaults: { isFilled: true, cornerRadius: 8 },
  },
  {
    id: 'coral-pop',
    name: 'Coral Pop',
    colors: {
      background: '#FFFFFF',
      surface: '#FFF1EE',
      text: '#1A1A2E',
      textMuted: '#6B7280',
      accent1: '#FF6B6B',
      accent2: '#4ECDC4',
      positive: '#2FAE66',
      negative: '#E63946',
      warning: '#F4A736',
    },
    fonts: { heading: FontStyle.Sans, body: FontStyle.Sans },
    shapeDefaults: { isFilled: true, cornerRadius: 32 },
  },
  {
    id: 'forest',
    name: 'Forest',
    colors: {
      background: '#F4F1EA',
      surface: '#E4DED0',
      text: '#2B2318',
      textMuted: '#6E6252',
      accent1: '#4A7856',
      accent2: '#C1502E',
      positive: '#5B8C3A',
      negative: '#9B3A2C',
      warning: '#B8862B',
    },
    fonts: { heading: FontStyle.Serif, body: FontStyle.Sans },
    shapeDefaults: { isFilled: true, cornerRadius: 4 },
  },
  {
    id: 'mono-grid',
    name: 'Mono Grid',
    colors: {
      background: '#FAFAFA',
      surface: '#EDEDED',
      text: '#111111',
      textMuted: '#555555',
      accent1: '#111111',
      accent2: '#E63946',
      positive: '#1F8A3B',
      negative: '#D32F2F',
      warning: '#C77700',
    },
    fonts: { heading: FontStyle.Mono, body: FontStyle.Sans },
    shapeDefaults: { isFilled: true, cornerRadius: 0 },
  },
]

// ---------------------------------------------------------------------------------------------
// T1 (post-review) — which theme is the read-side default, and why
// ---------------------------------------------------------------------------------------------
// This was `BUILT_IN_DECK_THEMES[0]` (`midnight`, a dark navy theme) until this was reviewed
// against a screenshot. That made every brand-new deck — and every template inserted into one —
// render dark navy by default, which is a strong, specific opinion for an editor that otherwise
// defaults to a plain, neutral canvas (Phase 1 deliberately chose `Solid`/`Sans` over the
// hand-drawn `Draw`/`Script` for exactly this reason: a slide tool's untouched state should look
// like a blank page, not a stylistic statement). Every mainstream slide tool's blank-deck default
// is a light, near-neutral surface, not a dark one.
// `mono-grid` was picked over the other four light themes by the same "look like a blank page,
// not a brand" standard, checked directly against a screenshot of a fresh deck under all five
// (see the Phase 12 report): its palette is functionally grayscale — `accent1` is the same
// near-black as `text`, and `accent2` (a red) appears only as a small, deliberate highlight — so
// it is the only one of the five that doesn't commit to a hue mood the way `ivory-editorial`
// (warm cream, amber/green), `coral-pop` (coral/turquoise), and `forest` (moss/rust) each do.
// `mono-grid`'s heading face is `FontStyle.Mono`, a specific look in isolation, but the least
// *colour*-opinionated theme is what matters most for a first-touch default — a user who dislikes
// the monospace heading is one `ThemeMenu` click from a different pairing, same as any other
// theme choice.
// This is a named constant, not `BUILT_IN_DECK_THEMES[<index>]`, on purpose: the array's order is
// also the order the `ThemeMenu` list renders in, a UI concern that has nothing to do with which
// theme new decks get. Coupling the two meant reordering the menu (e.g. alphabetizing it, or
// promoting a new theme to the top) would silently change the appearance of every untouched deck
// — exactly the fragility this constant exists to remove. `BUILT_IN_DECK_THEMES` itself is
// untouched; `midnight` keeps its place as the first, most attention-grabbing entry in the menu.
export const DEFAULT_DECK_THEME = BUILT_IN_DECK_THEMES.find((theme) => theme.id === 'mono-grid')!

/**
 * The theme to render a document with. A document that has never had one set renders against
 * `DEFAULT_DECK_THEME` rather than no theme at all.
 *
 * Without this, `TDDocument.theme` being optional (which it must be — no migration) meant every
 * token in a freshly inserted template resolved to `undefined` and fell through to the `color`
 * enum, so a carefully designed layout landed on the canvas as flat grey until the user happened
 * to open the theme menu. Templates are the first thing a user touches; they have to look right
 * on arrival.
 *
 * This is a *read-side* default only — nothing is written to the document, so an untouched deck
 * still persists without a `theme` field, and a shape that stores a plain hex rather than a token
 * is unaffected either way (`resolveThemeColor` passes non-token values straight through).
 */
export function activeDeckTheme(theme: DeckTheme | undefined): DeckTheme {
  return theme ?? DEFAULT_DECK_THEME
}
