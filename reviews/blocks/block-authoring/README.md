# Block authoring & insert UX — backlog

**Date:** 2026-09-24 · **Branch:** `plan/block-system` · **Base commit:** `de1b6f11`
**Goal:** a dev can add or customize a block with as little code as possible; a user drags a block
from a gallery onto a slide, it takes the slide's theme colours, and they can override / reset
colours, padding, and show/hide the block's inner elements.

This file is the lean index. Each task has its own detail file (`B<n>-*.md`) with the exact files,
steps, tests and Done-when — hand an agent **one** detail file plus this README.

Before writing any code, read: [../CURRENT-STATE.md](../CURRENT-STATE.md) (what exists),
[../BACKLOG-visual-fix-2.md](../BACKLOG-visual-fix-2.md) "Working rules" + "Gate commands"
(tsc = 0, OOM guard, targeted tests, full suite once per task), and the binding rules it points to.

---

## Review verdict (verified by reading code on 2026-09-24)

| Question | Today | Gap |
|---|---|---|
| Can blocks nest? | **Yes, in the spec.** `ctx.layoutChild(spec, box)` recurses (depth cap 4) with per-child style + surface resampling. 15 blocks use it (`kpi-row`→`kpi-tile`, `steps`, `image-text`, all layout containers). | ① A Tier B (HTML) block nested in a container renders with the **parent's** props, not its own (`HostMount` reads `HostLayoutContext.props` = top-level shape props; the `host` node carries no props) → **B1**. ② Only `row`/`stack`/`grid` declare `children` in their schema; `card`, `section`, `split`, `overlay`, `safe-area`, `sidebar`, `footer`, `repeater` read `children` through a cast, so the inspector / AI digest don't know they accept children → **B2**. ③ `card`, `section`, `safe-area` give **every** child the same box → 2+ children overlap → **B2**. ④ No UI to put a block inside another (only JSON) → deferred **B8**. |
| Can a new block be composed from existing ones? | **Yes, but only by writing a `layout()` by hand** (see `tls-c-kpi-row/layout.ts`). | No declarative helper: a dev must write layout math even when the block is "a card with a title, a number and a caption" → **B5**. |
| Can HTML blocks set padding / alignment? | **No.** Each template hard-codes its own (`hero`: none, `testimonial`: `48px`, `feature-grid`/`big-stat`: none). | `BlockStyleSpec` already declares `padding`, `align`, `gap`, `radius`, `tone`, `elevation`, `density` — **none is read anywhere** (0 consumers). Tier B also ignores instance `on`/`accent`/`surface` overrides (template `cssVar()` only points at deck-level vars) → **B3** (padding/align, both tiers) + **B1** (colour overrides for Tier B). |
| Show/hide inner elements? | **Ad hoc.** Some parts disappear when their text is empty (hero `kicker`); 4 blocks have one boolean (`title.rule`, `body.autoFit`, `bullets.indentLevels`, `kicker.marker`). | No convention, no inspector section, no test that a toggle really removes the part → **B4**. |
| Add-block panel shows all blocks with samples? | Lists all 40 (`registry.list()`), grouped by family, text only (name + summary), click inserts `def.defaults` at viewport centre. | No visual preview, no drag-and-drop, inserts `defaults` not the nicer `describe.example` → **B7**. |
| Inserted block follows slide colours? | **Yes already** — colours are roles, resolved against the current deck theme at render time. | Inspector Style tab writes raw hex only, shows fake defaults (`#ffffff`) when nothing is set, has **no reset to theme**; 81 of 148 schema fields (`role: 'option'` — variant, gap, columns, padding…) are **hidden** from the inspector; `list`/`object`/`color`/`icon`/`image`/`richText` fields render a label with no input; Motion tab writes 3 updates on every mount (undo-stack noise) → **B6**. |

**Bottom line:** the engine (layout, nesting, theming, motion) is sound. The gaps are in
*composition ergonomics* (B2, B5), *one real nesting bug* (B1), *an unused style contract* (B3,
B4), and *editor UI* (B6, B7).

---

## Tasks

| # | Task | Kind | Size | Depends on | Detail |
|---|---|---|---|---|---|
| **B1** | Nested HTML (Tier B) blocks render with their own props + honour instance colour overrides | bug | S–M | — | [B1-nested-html-host.md](B1-nested-html-host.md) |
| **B2** | Container schemas declare `children`; `card`/`section`/`safe-area` stack multiple children instead of overlapping | bug + schema | M | — | [B2-container-children.md](B2-container-children.md) |
| **B3** | Generic box style: `style.padding` + `style.align` work for every block, both tiers | feature | M | — | [B3-box-style-padding-align.md](B3-box-style-padding-align.md) |
| **B4** | Element visibility convention (`toggles`), conformance gate, retrofit composites | feature | M–L | — | [B4-element-visibility.md](B4-element-visibility.md) |
| **B5** | `defineCompositeBlock()` — build a block from a spec tree of existing blocks, no layout math | feature (DX) | M | B2, B4 | [B5-define-composite-block.md](B5-define-composite-block.md) |
| **B6** | Inspector: all fields editable, theme-role colour picker + reset, padding/align, element toggles | feature (UI) | L | B3, B4 | [B6-inspector.md](B6-inspector.md) |
| **B7** | Block gallery: live theme-coloured previews of every block, drag-and-drop + click insert | feature (UI) | L | — (nicer after B4) | [B7-block-gallery.md](B7-block-gallery.md) |
| B8 | Drop a block *into* a container on the canvas | feature (UI) | XL | B2, B6 | deferred — see below |

**Suggested order / parallelism:** B1, B2, B3, B7 touch disjoint files and can run in parallel
(B1: `types.ts` host node + `render-dom.tsx` + 4 Tier B `index.ts`; B2: `library/layout/*`; B3:
`layout-child.ts` + top-level `layout()` call sites; B7: `components/BlockInserter/*`). Then B4,
then B5 and B6. One agent per task; each task is one commit (or code + `B<n>: update progress`).

**B8 (deferred):** dragging a block onto a card/section and having it become `children[i]`
requires sub-selection of nested specs (select/inspect/move a child inside one tldraw shape via
`propPath`). Worth doing only after B2 + B6 land and only if B5 composites don't already cover the
need. Not planned in detail.

---

## Progress ledger

Same protocol as `BACKLOG-visual-fix-2.md` §Reporting: tick Done-when boxes in the detail file
only for what you verified, fill the row, commit, report the hash. `tsc` = production count, must
be 0.

| Task | Status | Commit | Date | tsc | Targeted tests | Full suite | Notes |
|---|---|---|---|---|---|---|---|
| B1 | ✅ done | d7ccb69d5e1881af50f4ec90588564272960c522 | 2026-09-24 | 0 | render-dom-nested-host + 4 Tier B specs + host-registry + parity + collision + slide-compiler | 174 suites, 2554 passed | Screenshot pending · see TODO-screenshots.md |
| B2 | ✅ done | 0c2484a8 | 2026-09-24 | 0 | container specs + catalog-conformance + safe-area + section + validate-deck-spec | 174 suites, 2594 passed | capability-digest budget raised 56k→57k for 8 children slots |
| B3 | ⬜ | — | — | — | — | — | |
| B4 | ⬜ | — | — | — | — | — | |
| B5 | ⬜ | — | — | — | — | — | |
| B6 | ⬜ | — | — | — | — | — | |
| B7 | ⬜ | — | — | — | — | — | |

---

## ⚠️ Pitfalls that apply to every task (verified 2026-09-24 — read before starting)

1. **The git pre-commit hook runs `yarn test`** (`.husky/pre-commit` → `turbo run test`, every
   package, the full jest suite). Committing *is* a full-suite run. Kill `parity-worker`
   processes before `git commit` (OOM guard), commit **once per task**, never `--no-verify`
   unless the user says so.
2. **tldraw state updates deep-merge; they never delete.** `app.updateShapes` → `Utils.deepMerge`
   (`packages/core/src/utils/utils.ts` ~l.1271): an omitted key is **kept**, arrays are replaced
   wholesale, objects are merged. To remove a key ("reset to theme") you must write the key with
   value `undefined` explicitly. Every reader must treat `undefined` as absent (`!== undefined`,
   not `in`).
3. **Where block data lives on a shape:** `blockToShape` (`blocks/shape-bridge.ts`) puts
   `spec.props` at the top level of `shape.props` and `{ id, style, motion, children }` under
   `shape.props.$block`. So layouts receive props **including** a `$block` key — ignore it, never
   iterate props blindly.
4. **Two "children" channels exist; only one is real.** Every container layout reads
   **`props.children`** (the one to use). `BlockSpec.children` (top-level field) is what
   `validateDeckSpec` recurses into, and it is **never rendered**. See B2.
5. **Nested child style:** `layoutChild` reads a child's style only from
   `child.props.$block.style` — a nested `{ type, props, style }` in deck JSON has its `style`
   **silently ignored**. See B3 step 0.
6. **Depth cap:** `MAX_DEPTH = 4` in `layout-child.ts` (and `MAX_NESTING_DEPTH` in the
   validator). B2 (stack delegation) and B5 (composites) each add levels. Past the cap
   `layoutChild` returns an error node, not a crash — tests must assert it's absent.
7. **Byte-identical rule** for `colorful-blocks-demo.json`: edit the fixture copy, then `cp` it
   to `examples/nextjs-sample/data/decks/`. Never hand-edit both.

## Side findings (not tasks; fix opportunistically, disclose if touched)

- `tls.c.feature-grid` cells have no `color` field, but `colorful-blocks-demo.json` sl_05 sets
  `color: red/blue/green` per cell — silently ignored (validation accepts unknown keys). Either add
  the field (additive) or drop it from the fixture (both copies, byte-identical).
- `validateDeckSpec` accepts undeclared props, which is why the undeclared `children` in B2 never
  failed. Tightening that is out of scope here; B2's conformance assertion covers the containers.
