# B4 — Element visibility: a `toggles` convention, a gate, and a retrofit · M–L · feature

## Problem

Users need to show/hide a block's inner elements (kicker, subtitle, CTA, delta, sparkline,
attribution, divider…). Today it's ad hoc: some parts vanish when their text is empty, 4 blocks
have one unrelated boolean each, and nothing tells the inspector which fields are "element
switches". Nothing tests that switching off actually removes the element and reflows.

## Design

1. **Schema convention (additive):** `SlotSpec` (`blocks/types.ts` l.309) gains
   `toggles?: string` — the `part` name this boolean shows/hides. A toggle slot is
   `{ type: { kind: 'boolean' }, role: 'option', label: 'Kicker', toggles: 'kicker' }`, key
   named `show<Part>` (e.g. `showKicker`). Default `true` in `defaults` unless the element is
   off by default.
2. **Helper:** `isShown(props, key): boolean` in `blocks/schema-helpers.ts` (or wherever shared
   block helpers live — grep first) → `props[key] !== false` (absent = shown, so existing decks
   are unchanged).
3. **Layout honours it:** the block's `layout()` / `template()` skips the part **and reflows**
   (no empty gap). This is why hiding is done in the block, not by the renderer blanking a part.
4. **Conformance gate** (`catalog-conformance.spec.ts`): for every block, for every slot with
   `toggles`: lay out `describe.example` with that key `false` → assert no node in the tree (Tier
   A) has `part === toggles` (or `startsWith(toggles + '[')`), and for Tier B the template output
   has no `data-part="<toggles>"`. Also assert the key starts with `show` and the type is boolean.
   This makes the convention self-enforcing for every future block.

## Retrofit (priority order — do as many as fit, list the rest in the ledger notes)

| Block | Toggles to add (verify part names in the block's layout/template first) |
|---|---|
| `tls.c.hero` (B) | `showKicker`, `showSubtitle`, `showCta` |
| `tls.c.kpi-tile` | `showDelta`, `showLabel`, `showSparkline` |
| `tls.c.big-stat` (B) | `showLabel`, `showContext` |
| `tls.c.testimonial` (B) | `showAvatar`, `showRole` |
| `tls.c.image-text` | `showKicker`, `showTitle`, `showBody` |
| `tls.t.quote` | `showAttribution`, `showMark` |
| `tls.l.section` | `showTitle`, `showDivider` |
| `tls.t.title` | existing `rule` boolean → add `toggles: 'rule'` (keep the key name; renaming breaks decks) |
| `tls.t.hero-number` | `showUnit`, `showCaption` |

Existing booleans that are **not** element switches (`body.autoFit`, `bullets.indentLevels`) get
no `toggles`.

Update each retrofitted block's `describe.when`/guidance if the AI should know about the switch;
update `size.preferred` only if the default appearance changes (it shouldn't).

## ⚠️ Hard parts — decisions already made

**H1. Tier B must hide in three places, not one:** `template()` (live DOM), `poster()` (export/
SVG — otherwise export shows the hidden element), and `animate()` (must not crash when a part
is missing). Hero's `animate` uses `querySelectorAll('[data-part]')` → safe. `big-stat`'s
`bigStatAnimate` (`tls-c-big-stat/index.ts` ~l.86) grabs `labelEl`/`contextEl` by
`querySelector` — read the whole function and null-guard every use before adding
`showLabel`/`showContext`. `testimonial` animate: same check for attribution parts.

**H2. Parity:** Tier A parity specs compare DOM vs SVG from the same tree → automatic. For
Tier B, add to the gate: poster tree has no node with the hidden part either.

**H3. Keep "empty text = hidden" too.** Shown = `isShown(props, 'showKicker') && !!props.kicker`.
Don't make the toggle the only switch — existing decks rely on empty-means-hidden.

**H4. Motion timing over-counts slightly.** `countLayoutParts` (`motion/timeline.ts` ~l.229)
uses the recipe's declared part count on the fast path, so a hidden part still adds one stagger
step to the block's show duration. Accept it (a few hundred ms); note it in the ledger. Don't
change timeline code in this task.

**H5. Conformance gate mechanics.** Tier A: `def.layout(exampleProps, ctx)` and walk the tree
for `part`. Tier B: call `def.html!.template(props, tplCtx)` with a stub
`tplCtx = { esc: s => s, cssVar: r => \`var(--tls-${r})\`, box, tokens }` (tokens via
`resolveTokens(BUILT_IN_DECK_THEMES[...])` as `tls-c-hero/index.ts`'s `derivePreferredSize`
does) and assert the string has no `data-part="<part>"`; plus the poster walk (H2). A
`toggles` value must match a real part name: also assert the part **is** present when the
toggle is `true` (catches typos in `toggles`).

**H6. `SlotSpec` is shared by the AI digest** (`capabilityDigest()`): check it prints the new
field sensibly or ignores it; `catalog-conformance` already asserts the digest doesn't throw.

## Tests

- The generic conformance gate (above) — this is the main test.
- Per retrofitted block: with the toggle off, the following element moves up (reflow), i.e. the
  reported height shrinks.
- Targeted: specs of touched blocks + conformance; full suite once; re-shoot both demo decks,
  confirm unchanged (all toggles default to shown).

## Done when

- [x] `SlotSpec.toggles` + `isShown` exist and exported from `blocks/index.ts`.
- [x] Conformance gate enforces it for every block: key starts with `show`, type is boolean,
      hiding removes the part from the layout tree (Tier A) and from template output (Tier B).
- [x] Retrofitted: section (`showTitle`/`showDivider`), hero (`showKicker`/`showSubtitle`/
      `showCta`), big-stat (`showLabel`/`showContext`), kpi-tile (`showDelta`/`showLabel`/
      `showSparkline`), image-text (`showKicker`/`showTitle`/`showBody`) — 5 of 8 blocks.
- [x] Unretrofitted (listed in ledger): testimonial (`showAvatar`/`showRole`), quote
      (`showAttribution`/`showMark`), title (`toggles: 'rule'` rename), hero-number
      (`showUnit`/`showCaption`).
- [x] Tier B animate functions already null-guarded (`querySel` returns null → skipped).
- [x] Demo decks visually unchanged (all toggles default to shown); tsc 0;
      targeted + full suite green (175 suites, 2765 tests); ledger row filled.

## Ledger

2026-09-24 — Committed `B4: element visibility convention (toggles + isShown + conformance gate + 5 block retrofits)`.

- Added `toggles?: string` to `SlotSpec` in `blocks/types.ts`.
- Created `blocks/schema-helpers.ts` with `isShown(props, key)` (returns `props[key] !== false`).
- Updated `catalog-conformance.spec.ts`: generic gate + per-block toggle-reflow test (Tier A layout tree walk; Tier B template string check + poster walk).
- Retrofitted 5 blocks:
  - `tls.l.section`: `showTitle`/`showDivider` — layout reflows offsets when hidden.
  - `tls.c.hero` (Tier B): `showKicker`/`showSubtitle`/`showCta` — template + poster guard with `isShown`.
  - `tls.c.big-stat` (Tier B): `showLabel`/`showContext` — template + poster guard with `isShown`. Animate already null-guarded.
  - `tls.c.kpi-tile`: `showDelta`/`showLabel`/`showSparkline` — layout + capacity() guard with `isShown`.
  - `tls.c.image-text`: `showKicker`/`showTitle`/`showBody` — layout + buildTextCluster guard with `isShown`.
- Added `collectParts` to `layout/test-helpers.ts`.
- Updated `capability-digest.spec.ts` char budget 57k→58k and snapshot with new schema fields.
- New test count: 175 suites, 2765 tests (was 2762 before B4).

## Side findings

- The `toggles` field in `SlotSpec` is printed by `capabilityDigest()` as part of the JSON schema, which is correct — the AI needs to know about element switches for prompting.
- `testimonial`, `quote`, `title`, `hero-number` retrofits deferred — they add no new concepts beyond the 5 done.
- The conformance gate's Tier B branch uses a stub `HtmlTemplateContext` (matching the pattern in `tls-c-hero.spec.ts`'s `tplCtx` helper).
