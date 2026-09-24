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

Also remove hard-coded outer padding from the 4 Tier B templates **only if** it's an outer
wrapper padding (`testimonial`'s `padding:48px` on the root) — replace it with the same default
through `defaults`/style so the block looks identical by default. If that's not cleanly possible,
leave it and disclose.

## Tests

- `layout-child` spec: no style → node deep-equals `def.layout()` output (identity invariant).
- padding `'lg'` → inner content box inset by `tokens.space.lg` on all sides; `[a, b]` form.
- align `center` with short content → content vertically centred (±1 unit).
- Tier B: padding insets host box and poster box equally.
- Compiler: a block with padding in a region reports natural height including padding.
- Targeted: `layout-child` specs, `slide-compiler` specs, parity specs, `collision.spec.ts`;
  `overlap-audit` still exit 0; full suite once.

## Done when

- [ ] `layoutBlock` exists and is the only way placed blocks are laid out (grep shows no stray
      direct call outside `layoutBlock` itself and specs).
- [ ] No-style identity invariant tested; all existing geometry specs unchanged.
- [ ] padding (token / number / tuple) and align work for Tier A and Tier B (tests).
- [ ] tsc 0, targeted + one full suite green, overlap-audit exit 0; ledger row filled.
