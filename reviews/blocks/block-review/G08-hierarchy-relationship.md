# G08 — hierarchy + relationship (8 blocks)

Part of the block UI review: read [README.md](README.md) (checklist §2, rules §3, commands §4) before touching code.

Run: `REVIEW_CATEGORY=<category> node tools/visual/shoot.js block-review --width=1600 --height=900` for each of: `hierarchy`, `relationship`. Shots land in `tools/visual/shots/review/<category>/`.

**Status:** ✅ done 2026-10-06 (8/8: 5 fixed, 3 unchanged apart from the shared text fix) · **Agent:** B2 agent · **Last commit:** `d176893e`

## Blocks

Columns are the §2 checks. Cell values: ⬜ not checked · ✅ pass (as-is) · 🔧 fixed · ❌ broken, not fixed (see Findings) · ⏸ blocked (see Findings) · n/a.

| Block | Category | Scope | Kind | C1 card | C2 drop+inspector | C3 wide | C4 narrow | C5 motion | C6 AI metadata | Status | Commit | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| tls.g.tree | hierarchy | group | layout | ✅ | ✅ | ✅ | ✅ | 🔧 | ✅ | 🔧 | `d176893e` | `grow-branches` (draw-path no-op) and parts `link[*]`/`node[*]` never matched the id-path names (`node[0-1]`): numbered `item[k]`/`edge[k]` groups, sweep-nodes |
| tls.g.pyramid | hierarchy | group | layout | ✅ | ✅ | ✅ | ✅ | 🔧 | ✅ | 🔧 | `d176893e` | leaders were not motion parts (visible before their level) |
| tls.g.layers | hierarchy | group | layout | ✅ | ✅ | ✅ | ✅ | 🔧 | 🔧 | 🔧 | `d176893e` | `reveal-down` clip-path snaps (S16) -> stagger-children; 22/18 unit text on 120 unit bars -> next type step when rows >= 72 |
| tls.g.breakdown | hierarchy | group | layout | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | `eceb981b`/`6678fa80` | unchanged except the shared real-width text fix ("$30k" box was 6 px narrow) |
| tls.g.mindmap | hierarchy | group | layout | ✅ | ✅ | ✅ | ✅ | 🔧 | 🔧 | 🔧 | `d176893e` | example was 2 branches x 1 child = one flat row, not a mind map; now 4 branches x 2; `child[i-j]` parts never matched `child[*]`; grow-branches -> sweep-nodes |
| tls.g.venn | relationship | group | layout | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | `6678fa80` | unchanged (set groups cover their labels); example-fits and motion specs added |
| tls.g.hub-spoke | relationship | group | layout | ✅ | ✅ | ✅ | ✅ | 🔧 | ✅ | 🔧 | `d176893e` | spoke labels were not motion parts and sat left-aligned in their card: centred, parts added |
| tls.g.bracket | relationship | group | layout | ✅ | ✅ | ✅ | ✅ | 🔧 | ✅ | 🔧 | `d176893e` | `draw-path` on filled groups is a no-op (S14) -> sweep-nodes over items, brace, label |

## Findings

One entry per problem: block, check id, what was wrong (with the shot file name), what was done, and the test that now covers it. Problems outside this group's files go to **Shared issues raised** below instead.

1. **Motion recipes did not cover the drawn parts (tree, pyramid, layers, mindmap, hub-spoke, bracket; also G07 cycle, funnel, milestones)**: a recipe part that names only the box leaves the label, leader or arrow head visible while the box is still hidden (the block wrapper fades in first). New `assertMotionTargetsExist` in `diagram/diagram-test.ts` requires every part named in `motion.parts` to exist in the example layout (same matcher as `partElements`), every drawn leaf to sit under an animated part, and the preset not to be one of the known non-animating ones. All 16 diagram specs run it; recipes were completed (labels, notes, leaders, arrow heads, progress line) and `grow-branches`, `reveal-down`, `draw-path` (S14/S16) replaced by `sweep-nodes` / `stagger-children`.
2. **Part names the matcher cannot reach**: `partElements` only matches `name[<digits>]`. tls.g.tree names nodes by id path (`node[0-1]`, pinned by its spec): each node and link now sits in a numbered group (`item[k]`, `edge[k]`), leaves unchanged. tls.g.mindmap `child[0-1]` -> `child[0][1]`, `link[0-1]` -> `link[0][1]` (spec regexes updated for the rename).
3. **tls.g.mindmap C6**: the example (2 branches, 1 child each) rendered as one flat row `Channels - Marketing - Launch plan - Product - Scope` (`hierarchy/g-mindmap.wide.png`). Now 4 branches x 2 children on both sides; avoid names tls.g.hub-spoke.
4. **tls.g.hub-spoke**: labels centred when the spoke has no icon (`relationship/g-hub-spoke.card.png`: left-aligned in the card).
5. **tls.g.layers**: bars up to 120 units tall carried 22/18 unit text; type steps up when rows are >= 72 high.
6. **Passed unchanged**: tls.g.breakdown, tls.g.venn (apart from the shared text-width fix in `diagram/_kit.ts` and the new specs).
7. Gallery card specks for wide group blocks: S9/S21 (not fixable here). tls.g.tree / mindmap drops are intact because they nest instead of referring to ids (S20 only hits tls.g.flow).

## Shared issues raised

Problems whose fix lies outside this group's files (README §3 rule 1). The controller copies them into README §5.

- S20 and S21 as listed in G07 (flow drop breaks via `clone-spec.ts`; card scaling for wide blocks).

## Session log

| Date | Agent | Moved | Notes for next session |
|---|---|---|---|
| 2026-10-06 | B2 agent | G08 8/8: `d176893e` (tree, mindmap, layers, pyramid, hub-spoke, bracket + motion coverage of G07 cycle/funnel/milestones) | breakdown and venn unchanged. The motion-coverage helper is reusable for other families (`assertMotionTargetsExist`) |
