# G01 — structure (13 blocks)

Part of the block UI review: read [README.md](README.md) (checklist §2, rules §3, commands §4) before touching code.

Run: `REVIEW_CATEGORY=<category> node tools/visual/shoot.js block-review --width=1600 --height=900` for each of: `structure`. Shots land in `tools/visual/shots/review/<category>/`.

**Status:** ⬜ not started · **Agent:** — · **Last commit:** —

## Blocks

Columns are the §2 checks. Cell values: ⬜ not checked · ✅ pass (as-is) · 🔧 fixed · ❌ broken, not fixed (see Findings) · ⏸ blocked (see Findings) · n/a.

| Block | Category | Scope | Kind | C1 card | C2 drop+inspector | C3 wide | C4 narrow | C5 motion | C6 AI metadata | Status | Commit | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| tls.l.stack | structure | element | layout | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | | |
| tls.l.row | structure | element | layout | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | | |
| tls.l.grid | structure | element | layout | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | | |
| tls.l.split | structure | element | layout | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | | |
| tls.l.overlay | structure | element | layout | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | | |
| tls.l.card | structure | element | layout | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | | |
| tls.l.section | structure | element | layout | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | | |
| tls.l.repeater | structure | element | layout | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | | |
| tls.l.spacer | structure | element | layout | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | | |
| tls.l.safe-area | structure | element | layout | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | | |
| tls.l.grid-guide | structure | element | layout | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | | |
| tls.l.sidebar | structure | element | layout | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | | |
| tls.l.footer | structure | element | layout | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | | |

## Findings

One entry per problem: block, check id, what was wrong (with the shot file name), what was done, and the test that now covers it. Problems outside this group's files go to README §5 Shared issues instead.

_None yet._

## Session log

| Date | Agent | Moved | Notes for next session |
|---|---|---|---|
