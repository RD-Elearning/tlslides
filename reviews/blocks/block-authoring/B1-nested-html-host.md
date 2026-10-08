# B1 — Nested HTML (Tier B) blocks: own props + instance colours · S–M · bug

## Problem

Tier B blocks (`tls.c.hero`, `tls.c.feature-grid`, `tls.c.testimonial`, `tls.c.big-stat`) have an
auto-generated `layout()` that returns `{ k: 'host', box, part: 'root', render: '<type>', poster }`
(see `library/composite/tls-c-hero/index.ts`, `heroLayout`). The DOM renderer mounts it with
`HostMount` (`blocks/render-dom.tsx` ~l.311), which takes its props from
`HostLayoutContext.props`. That context is provided **once per tldraw shape** with the shape's
top-level props:

- editor: `state/shapes/ComponentUtil/ComponentUtil.tsx` ~l.208
- viewer: `components/DeckViewer/DeckViewer.tsx` ~l.767

So when a Tier B block is a **child** (e.g. `tls.l.card` → `children: [{ type: 'tls.c.big-stat', props: {...} }]`),
`ctx.layoutChild` produces the right `host` node, but `HostMount` renders the big-stat template
with the **card's** props. Result: empty/default content in the editor and viewer; the SVG/export
path is correct because it draws the `poster`, which was built with the child's own props → DOM
and export disagree.

Second, smaller problem: instance colour overrides (`$block.style.on/accent/surface`) are applied
for Tier A through `wrappedResolveColor` in `layout/layout-child.ts`, but a Tier B template only
emits `var(--tls-accent)` etc. (`createHtmlBlockRenderer`, `render-dom.tsx` ~l.212) — nothing sets
those vars per instance, so overrides are ignored in the live DOM (but honoured by the poster).

## Steps

1. **Write the failing test first** (`blocks/render-dom-nested-host.spec.tsx` or extend
   `host-registry.spec.tsx`): render `renderNodeToDom(cardDef.layout({ padding: 'md', children: [bigStatSpec] }, ctx))`
   inside a `HostLayoutContext.Provider` whose `props` are the *card's* props; assert the mounted
   DOM contains the big-stat's value text. Confirm it fails today.
2. `blocks/types.ts` l.397: extend the host node **additively**:
   `{ k: 'host'; box; part?; render; poster?; props?: Record<string, unknown>; vars?: Record<string, string> }`.
   `vars` = CSS custom properties to set on the host root (e.g. `{ '--tls-accent': '#ff0000' }`).
3. In each of the 4 Tier B `index.ts` auto-layouts, put `props` on the node, and compute `vars`
   from `ctx`: for each of `accent`, `on`→ the var the template uses for foreground, `surface`, call
   `ctx.resolveColor(role).color` **only when `ctx.style` sets that key** (so un-overridden blocks
   keep inheriting deck vars and the theme switch still works). Look up the real var names in
   `CSS_VAR_MAP` (`render-dom.tsx`) — do not invent names.
   Better: factor this into one helper (e.g. `htmlHostNode(def, props, ctx, poster)` in
   `blocks/html-block.ts` or next to `createHtmlBlockRenderer`) and call it from all 4, so the next
   Tier B block gets it for free. The 4 layouts are near-identical today — dedupe them.
4. `HostMount`: accept `props` and `vars` from the node (`renderNodeToDom` case `'host'` passes
   them); use `node.props ?? layoutCtx.props`; apply `vars` with `root.style.setProperty` on mount
   and update (and clear removed ones). Include `vars` in the "changed" check that triggers
   `update`.
5. Check `render-svg.ts` (`case 'host'`) and `parity-harness.ts` (`case 'host'`) still type-check
   and ignore the new fields (they render the poster).

## ⚠️ Hard parts — decisions already made (follow these, don't re-decide)

**H1. Where CSS vars come from today.** `HostMount` puts `hostCssVarStyle(tokens, surface)` as
**inline style** on the host root div (`render-dom.tsx` ~l.144 and the returned `<div style>`).
It sets `--tls-on: tokens.color.text` and `--tls-accent: tokens.color.accent` straight from the
theme — **not contrast-solved** against the surface — plus `--tls-surface` from the *top-level
shape's* surface. For a nested host, all three are the parent shape's values → wrong.
**Decision:** don't use `root.style.setProperty`. Merge `node.vars` **after**
`hostCssVarStyle(...)` in that same inline style object (`{ ...hostCssVarStyle(...), ...node.vars }`).
React then owns them, updates/removal are automatic, no cleanup code.

**H2. When to emit `vars` (the regression trap).** If every Tier B node always emits vars from
`ctx.resolveColor`, top-level blocks change colour (contrast-solved `text` ≠ raw
`tokens.color.text`) → visual diffs on shipped slides. **Rule:** emit `vars` only when
`ctx.depth > 0` (nested) **or** `ctx.style` sets `on`/`accent`/`surface`. Otherwise
`vars` is `undefined` and today's output is untouched. Mapping (real names in `CSS_VAR_MAP`):
`'--tls-on' ← ctx.resolveColor('text').color`, `'--tls-accent' ← ctx.resolveColor('accent').color`,
`'--tls-text-muted' ← ctx.resolveColor('textMuted').color`,
`'--tls-surface'` and `'--tls-surface-color' ← ctx.resolveColor('surface').color` (only when
`ctx.style.surface` is set or nested). `ctx.resolveColor` already applies instance overrides.

**H3. Which props to put on the node.** Use the `props` argument the auto-layout receives (for a
top-level shape that is `shape.props` incl. the `$block` key; for a child it is `child.props`).
In `HostMount`: `const hostProps = nodeProps ?? layoutCtx?.props ?? {}`.

**H4. `HostMount` change detection.** The update effect compares `JSON.stringify(hostProps)` and
box size, deps `[hostProps, box.width, box.height]`. `node.props` is a new object on every
render (layout re-runs) — that's fine because of the JSON compare; do **not** add
`React.memo` custom comparators. Vars need no effect (H1: they're inline style).

**H5. `renderNodeToDom` case `'host'`** must pass `props={node.props}` and `vars={node.vars}`
to `HostMount`; extend `HostMountProps`. `render-svg.ts` and `parity-harness.ts` `case 'host'`
use `poster` only — they compile unchanged; don't touch them beyond types.

**H6. Nested host inside a group is positioned by its own `box`** (absolute inside the parent
group div) — already correct, no change.

## Tests

- New nested-host test from step 1 passes.
- A test that a Tier B instance with `$block.style.accent = '#ff0000'` produces a host root whose
  `--tls-accent` (or the real mapped var) is `#ff0000`, and one without the override sets nothing.
- Targeted: `host-registry.spec.tsx`, the 4 Tier B block specs, `catalog-conformance.spec.ts`,
  parity specs. Full suite once at the end (OOM guard).
- Visual: add a slide to **both** `colorful-blocks-demo.json` copies (byte-identical, `cp`) with a
  `tls.l.card` containing a `tls.c.big-stat`, shoot it with `tools/visual/shoot.js`, open the PNG.
  Bump the slide count wherever a spec/scenario asserts it.

## Done when

- [x] A Tier B block nested in any container renders its own props in editor and viewer (test).
- [x] Instance `accent`/`on`/`surface` overrides are visible on a Tier B block's live DOM (test).
- [x] The 4 Tier B layouts share one host-node helper.
- [ ] Screenshot of the nested slide opened and looks right. (pending — see TODO-screenshots.md)
- [x] tsc 0, eslint no new errors, targeted + one full suite green; ledger row filled.
