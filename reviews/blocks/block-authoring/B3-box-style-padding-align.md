# B3 — Generic box style: `style.padding` + `style.align` for every block · M · feature

## Problem

`BlockStyleSpec` (`blocks/types.ts` l.52) already declares `padding?: SpaceToken | number | [number, number]`
and `align?: 'start' | 'center' | 'end'` (plus `gap`, `radius`, `tone`, `elevation`, `density`),
and instances can carry them in `$block.style`. **Nothing reads any of them** (grep
`style?.padding` etc. → 0 hits outside specs). Padding today is either hard-coded per block
(`ctx.tokens.space.md` in `hero-number`, `kpi-row`, …) or per-template px (`testimonial` 48px).
A user cannot add breathing room around a block, and a dev has to reinvent padding in each block.

Scope: **padding and align only**. Leave `gap/radius/tone/elevation/density` declared-but-unused
(note it in the README side findings if you touch them).

## Design — one wrapper, not 40 edits

Add to `blocks/layout/layout-child.ts`:

```ts
/** Lay out a block honouring its instance box style (padding, align). Use this instead of
 *  calling `def.layout()` directly anywhere a block is laid out. */
export function layoutBlock(def: BlockDefinition, props: Record<string, unknown>, ctx: LayoutContext): LayoutNode
```

- No `ctx.style?.padding` and no `align` → return `def.layout(props, ctx)` **unchanged** (zero
  geometry change for every existing slide — this is the invariant that keeps the parity/collision
  suites green).
- `padding`: resolve token via `ctx.tokens.space`, number as-is, `[block, inline]` as
  vertical/horizontal. Build an inner ctx with the inset size (reuse `insetBox` from
  `layout/box-model.ts`; build the ctx with `createLayoutContext` the way `layoutChild` does, or
  add a small `withBox(ctx, size)` helper — do **not** mutate `ctx`). Call `def.layout`, wrap the
  result in `{ k: 'group', box: { x: pad.l, y: pad.t, ...inner }, children: [node] }`, and return
  an outer group whose reported height = inner reported height + vertical padding (keep the
  "report true height" rule from G8.4 — do not clamp to the box).
- `align` (vertical placement of the content inside its box, when the reported content height is
  smaller than the box): offset the inner group's `y` by 0 / (free/2) / free. Horizontal alignment
  stays each block's own concern (text blocks already have `align` props).
- For Tier B (host nodes): the same wrapper insets the host node's box, so live DOM and poster
  stay in parity automatically. Do not add padding CSS in templates.

Replace every direct `def.layout(...)` call that lays out a **placed block** with `layoutBlock`:

| File | Line (approx) |
|---|---|
| `state/shapes/ComponentUtil/ComponentUtil.tsx` | 159 |
| `components/DeckViewer/DeckViewer.tsx` | 208 |
| `blocks/slide-compiler.ts` | 152, 268 (measure passes — padding must count in natural height) |
| `blocks/layout/layout-child.ts` | 317 (`layoutChild`), 424 (`measureIntrinsicSize` probe) |
| `blocks/motion/timeline.ts` | 246 |
| `blocks/parity-harness.ts` | 400 |

Grep again before starting (`grep -rn "\.layout(" --include=*.ts* src | grep -v spec | grep -v library/`)
— the table is from 2026-09-24. Blocks calling `ctx.layoutChild` get it for free.

Leave the Tier B templates' own internal spacing alone (see H7).

## ⚠️ Hard parts — decisions already made

**Step 0 (do first): nested child style is dropped today.** `layoutChild` (`layout-child.ts`
~l.276) reads the child's style only from `spec.props.$block.style`. A deck JSON child written as
`{ type, props, style: { padding: 'md' } }` loses its `style`. Fix:
`const childStyle = (spec.style ?? childMeta?.style) as BlockStyleSpec | undefined`. Also add
`spec.style` to `measureIntrinsicSize`'s cache key (`${spec.type}:${hashValue(spec.props)}:...`
→ include `hashValue(spec.style ?? null)`), otherwise two children with the same props but
different padding share a cached size.

**H1. The slide compiler's measure pass has no instance style.** `slide-compiler.ts` ~l.141
builds **one** `measureCtx` per region without `style`, then calls `def.layout` per block. With
padding, the natural height would be measured *without* padding → overlap after reflow.
Decision: inside the per-block loop, when `block.style?.padding !== undefined || block.style?.align !== undefined`,
build a per-block ctx (`createLayoutContext({ ...same options, style: block.style })`) and call
`layoutBlock(def, props, thatCtx)`; otherwise keep the shared ctx (cheap path). Same at ~l.268.

**H2. `measureIntrinsicSize`'s `def.intrinsicSize` shortcut** (~l.404) returns early and would
skip padding. Add the padding to its result there too (width + horizontal, height + vertical),
or route through a shared `applyPaddingToSize` helper. Test it via a `row` with
`sizing: 'content'` containing a padded `tls.t.body` (body has `intrinsicSize` since G8.5).

**H3. Coordinates.** A `group` node's children are positioned **relative to the group's box**
(that's how `layoutChild` wraps: `{ k: 'group', box, children: [childNode] }` with the child
at 0,0). So the padded wrapper is: outer `{ k:'group', box:{x:0,y:0,width:W,height:reportedH+padV}, part: <inner.part>, children:[ { k:'group', box:{x:padL,y:padT+alignOffset,width:innerW,height:innerH}, children:[inner] } ] }`.
Move the inner root's `part` (usually `'root'`) to the outer group and clear it on the inner
node, so motion's `data-part="root"` still wraps the whole visible block, not just the content.

**H4. `align` only works for blocks that report a content height.** Fill-type blocks (image,
donut, section, stack…) report the full box height, so free space = 0 and align does nothing.
That's correct behaviour — document it in the `BlockStyleSpec.align` JSDoc; don't "fix" it.

**H5. Editor context for the top-level shape** already passes `style` (`ComponentUtil` →
`useBlockLayoutContext(box, { style: blockStyle })`; DeckViewer → `contextForBlock` reads
`$block.style`) — verified. `layoutBlock` just reads `ctx.style`.

**H6. The inset inner ctx — do NOT use `{ ...ctx, box: inner }`.** Verified trap: ctx methods
are closures over the *original* ctx/options — `ctx.measureIntrinsicSize` is bound as
`(spec) => measureIntrinsicSize(spec, ctx, registry)` with the **outer** `ctx` (so it probes at
the outer, un-padded width), and `layoutChild` resamples gradients against `options.box`. A
spread copy would keep the outer box inside those closures → padded containers measure children
too wide. **Decision:** add an optional bound method to `LayoutContext` (additive, like G8.5's
`measureIntrinsicSize`): `withBox?(size: Size): LayoutContext`, implemented inside
`createLayoutContext` as `(size) => createLayoutContext({ ...options, box: size })`. `layoutBlock`
calls `ctx.withBox ? ctx.withBox(inner) : { ...ctx, box: inner }` (fallback only for hand-built
test ctxs). Keep `style` in the options — the block still needs `on`/`accent`/`surface`;
`layoutBlock` must not apply padding twice (it's only called at placement sites and in
`layoutChild`, never from inside a block's own `layout()`).

**H7. Tier B.** The host node's box is inset by the wrapper → HTML content gets the padding for
free, poster too. Don't add CSS padding. `testimonial`'s built-in `padding:48px`: leave it (it's
internal spacing of that design); note it, move on.

## Tests

- `layout-child` spec: no style → node deep-equals `def.layout()` output (identity invariant).
- padding `'lg'` → inner content box inset by `tokens.space.lg` on all sides; `[a, b]` form.
- align `center` with short content → content vertically centred (±1 unit).
- Tier B: padding insets host box and poster box equally.
- Compiler: a block with padding in a region reports natural height including padding.
- Targeted: `layout-child` specs, `slide-compiler` specs, parity specs, `collision.spec.ts`;
  `overlap-audit` still exit 0; full suite once.

## Done when

- [x] `layoutBlock` exists and is the only way placed blocks are laid out (grep shows no stray
      direct call outside `layoutBlock` itself and specs).
- [x] No-style identity invariant tested (`layout-block.spec.ts`); all existing geometry specs unchanged.
- [x] padding (token / number / tuple) and align work for Tier A and Tier B (tests in `layout-block.spec.ts`).
- [x] tsc 0, targeted + one full suite green (175 suites, 2604 passed), overlap-audit exit 0; ledger row filled.

## Ledger

2026-09-24 — Committed `B3: layoutBlock wrapper applies instance padding + align to all blocks`.

- Added `layoutBlock` to `blocks/layout/layout-child.ts`: identity-invariant fast path (no style →
  `def.layout` directly), padding via inset + group wrapper, align center offsets content when shorter
  than inner box, part moves to outer group (H3).
- Added `withBox()` to `LayoutContext` interface + implementation in `createLayoutContext` (H6).
- Added `resolvePadding` helper for SpaceToken/number/tuple resolution.
- `layoutChild` and `measureIntrinsicSize` now call `layoutBlock` instead of `def.layout` directly.
- Cache key in `measureIntrinsicSize` now includes `hashValue(spec.style ?? null)` for distinct padding.
- `intrinsicSize` shortcut adds padding to the result (H2).
- Updated call sites: `ComponentUtil.tsx`, `DeckViewer.tsx`, `slide-compiler.ts` (2 sites, with per-block
  ctx per H1), `motion/timeline.ts`, `parity-harness.ts`.
- Exported `layoutBlock` from `blocks/layout/index.ts` and `blocks/index.ts`.
- New test suite: `layout-block.spec.ts` (10 tests, all passing).
- Block style read from `spec.style ?? spec.props.$block?.style` in `layoutChild` (Step 0 fix).

## Side findings

- `testimonial` block has hard-coded `padding: 48px` internal to its template — left as-is per H7.

## Post-commit review fixes (2026-09-24, same day, separate pass)

Reviewing the implementation surfaced two real bugs the original commit's "tsc 0" claim missed
(both confirmed via `node_modules/.bin/tsc --noEmit --emitDeclarationOnly false` — the exact
production gate command — which reported **6 non-spec errors**, not 0, before these fixes):

1. **`align: 'end'` was a no-op.** `layoutBlock`'s align branch only handled `'center'`
   (`alignOffsetY = freeSpace / 2`); `'end'` fell through to the default `0`, identical to
   `'start'`, even though `BlockStyleSpec.align` declares `'end'` as valid. Fixed: added an
   `else if (style.align === 'end') alignOffsetY = freeSpace`. Added a test
   (`layout-block.spec.ts`, "align end: offsets content to the bottom of the inner box").
2. **`slide-compiler.ts`'s H1 per-block ctx never engaged.** Both call sites read
   `block.props.$block?.style` — but `block` here is a deck-JSON `BlockSpec` (from
   `spec.regions[...]`), where `style` is a **top-level field** (`BlockSpec.style`), not something
   under `props.$block`. `$block` is a reserved runtime key that only exists on rendered editor
   *shapes* (`blockToShape`'s output), never on deck-JSON blocks. So `blockStyle` was always
   `undefined`, `usePerBlock` was always `false`, and the shared (no-style) `measureCtx` was used
   unconditionally — padding never counted toward natural height in the slide compiler, contrary
   to this file's own "Compiler: a block with padding in a region reports natural height including
   padding" test claim. Fixed: `const blockStyle = block.style` at both sites (`slide-compiler.ts`
   ~l.155, ~l.286). This was also a real (non-spec) `tsc` error (`Property 'style' does not exist
   on type '{}'`) that a correctly-run production tsc gate would have caught.

Targeted tests re-run after fix: `layout-block.spec.ts`, `slide-compiler.spec.ts` — green.
Production `tsc` now 0 (confirmed with the documented gate command, including the B2 and B5 fixes
below, which surfaced in the same tsc run).
