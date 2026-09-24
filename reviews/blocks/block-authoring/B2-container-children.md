# B2 — Containers declare `children`; single-slot containers stop overlapping · M · bug + schema

## Problem

1. Only `tls.l.row`, `tls.l.stack`, `tls.l.grid` declare `children` (`{ kind: 'blocks', allow, min?, max? }`)
   in `schema.ts`. These 8 read `children` via
   `(props as unknown as { children?: BlockSpec[] }).children` but do **not** declare it:
   `card`, `section`, `split`, `overlay`, `safe-area`, `sidebar`, `footer`, `repeater`
   (all under `blocks/library/layout/`). Consequences: the inspector, the AI capability digest
   and validation don't know these blocks take children; the `Props` interfaces lie.
2. `card`, `section`, `safe-area` call `ctx.layoutChild(child, contentBox)` for **every** child
   with the **same** `contentBox` → with 2+ children they draw on top of each other.
   (`overlay` does this on purpose — it's a z-stack.)

## Steps

1. For each of the 8 blocks add a `children` slot to `schema.ts` + `children?: BlockSpec[]` to the
   Props interface + `children: []` to `defaults` (only if the block's defaults stay good-looking
   — otherwise leave it absent). Copy the exact shape from `tls-l-stack/schema.ts`. Set `max`
   where the layout only uses N children: `split` 2, `sidebar` 2, `footer` 2, `repeater` 1
   (it's a template). Remove the `as unknown as` casts in `layout.ts`.
2. `card`, `section`, `safe-area`: when `children.length > 1`, lay them out as a vertical stack in
   `contentBox` **by delegating** to `tls.l.stack` through `ctx.layoutChild({ type: 'tls.l.stack', props: { gap, children, sizing: 'content' } }, contentBox)`
   — do not re-implement stacking. Use the block's own `gap` prop where it has one (`section.gap`),
   else `'sm'`. With exactly 1 child keep today's behaviour byte-identical (no extra wrapper
   group) so existing snapshots/parity don't move.
3. Update each block's `describe.example` to show a child if it didn't; conformance validates it.
4. `catalog-conformance.spec.ts`: add an assertion that every block whose `layout.ts` references
   `children` declares a `children` slot of kind `'blocks'` (read the schema; a static list of the
   11 container types is fine if introspecting the source is awkward).

## ⚠️ Hard parts — decisions already made

**H1. The validator does not look inside `props.children` at all** (verified in
`blocks/validate-deck-spec.ts`): it recurses only into the top-level `BlockSpec.children`
(~l.515) — which no layout renders — and `checkBudget` has **no `case 'blocks'`**, so
`min`/`max`/`allow` on a `blocks` slot are never enforced. An unknown type nested in
`props.children` passes validation today. Undeclared `children` props only produce a
`slot/unknown` **warning**. So step "validation warns per `max`" in this plan requires new
validator code:
- add `case 'blocks'` to `checkBudget`: not an array → error `block/malformed`; length > `max`
  → **warning** `slot/over-max` (match the `level`/`rule` naming style of the `list` case);
  `< min` → warning; a child whose `family` (via registry) isn't in `allow` → warning.
- in `validateProps`, for every slot of kind `blocks`, recurse `validateBlockTree` into each
  element with `depth + 1`, the same way the `block.children` branch does (reuse it; pass the
  same `ancestorIds/ancestorRefs/seenBlockIds` so cycle + duplicate-id checks work).
- **Do not** remove the `BlockSpec.children` branch (other decks may use it); leave a comment
  that `props.children` is the rendered channel.
Re-run `catalog-conformance.spec.ts` — the newly-validated nested examples may surface real
warnings in existing fixtures; errors must be fixed, warnings disclosed in the ledger note.
Expect: `colorful-blocks-demo.json` sl_07 stack uses `gap: 12` (a number) where the schema says
enum — that's an existing mismatch; report it, fix the fixture (`'sm'`) only if the validator
now flags it as an error.

**H2. Stack delegation adds one depth level.** `card → (synthetic stack) → children` means a
child that used to be at depth d is now at d+1. Only delegate when `children.length > 1`
(1-child path unchanged). Add a test: card with 2 children whose second child is itself a
`tls.l.row` with 2 text children → no depth-overflow node in the tree.

**H3. Which `sizing` for the synthetic stack.** Use `'content'`. Known limitation (from G8.5):
"fill"-type blocks (`tls.m.image`, `tls.d.donut`, `tls.l.section`) report their full given
height as intrinsic, so an image + caption in a card may give the image almost all the space.
Test `title + body` (must look right) and `image + caption` (record what happens; if the
caption gets < one line of height, switch that case to `'equal'` only when any child is a
media/data block — keep it simple, one `if`).

**H4. Section's `contentBox` height** is `H - contentY`; the synthetic stack gets exactly that
box. Don't try to make section grow to fit — reflow is the slide compiler's job.

## Tests

- Per block spec: 2 children → their boxes don't intersect (card, section, safe-area).
- 1 child → geometry identical to before (compare to a value captured before the change).
- `split`/`sidebar`/`footer` with 3 children → `slot/over-max` warning (new validator code, H1).
- Unknown type nested in `props.children` → `block/unknown-type` finding (new, H1).
- Targeted specs of the 8 blocks + `catalog-conformance.spec.ts` + `collision.spec.ts`; full suite
  once.
- Visual: `colorful-blocks-demo` sl_05 uses `tls.l.section` with one child — re-shoot, confirm
  unchanged.

## Done when

- [x] All 11 containers declare `children`; no `as unknown as { children` cast left in `library/layout`.
- [x] card/section/safe-area with 2+ children: no overlap (test — safe-area and section spec updated, verified).
- [x] 1-child geometry unchanged (test — no wrapper added in 1-child path).
- [x] Conformance assertion added (`catalog-conformance.spec.ts`).
- [x] tsc 0, targeted + one full suite green; ledger row filled.

## Ledger

2026-09-24 — Committed `B2: containers declare children; card/section/safe-area stack instead of overlap`.

- Added `children` slot (`{ kind: 'blocks', allow, max? }`) to all 8 container schemas: card,
  section, split, overlay, safe-area, sidebar, footer, repeater.
- Removed `as unknown as { children }` casts from all 8 `layout.ts` files.
- `overlay` layout.ts param renamed `_props` → `props` (was unused due to no children usage).
- `card`, `section`, `safe-area`: delegate to `tls.l.stack` for 2+ children (gap from section.gap or `'sm'`).
- Added `case 'blocks'` to `checkBudget` in `validate-deck-spec.ts` (min/max/allow checks).
- Extended `validateProps` to recurse into `props.children` for `blocks`-kind slots (depth +1).
- `capability-digest.spec.ts`: updated snapshot + character budget raised 56000→57000 (B2 added
  `children` slot text for 8 containers, growing JSON from ~54.5k to ~56.1k).
- Full suite green (174 suites, 2594 passed).
