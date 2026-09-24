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

## Tests

- Per block spec: 2 children → their boxes don't intersect (card, section, safe-area).
- 1 child → geometry identical to before (compare to a value captured before the change).
- `split`/`sidebar`/`footer` with 3 children → validation warns/errors per `max` (check how
  `validateDeckSpec` reports `max` for `row`, match it).
- Targeted specs of the 8 blocks + `catalog-conformance.spec.ts` + `collision.spec.ts`; full suite
  once.
- Visual: `colorful-blocks-demo` sl_05 uses `tls.l.section` with one child — re-shoot, confirm
  unchanged.

## Done when

- [ ] All 11 containers declare `children`; no `as unknown as { children` cast left in `library/layout`.
- [ ] card/section/safe-area with 2+ children: no overlap (test).
- [ ] 1-child geometry unchanged (test).
- [ ] Conformance assertion added.
- [ ] tsc 0, targeted + one full suite green; ledger row filled.
