# G07 — process + timeline (10 blocks)

Part of the block UI review: read [README.md](README.md) (checklist §2, rules §3, commands §4) before touching code.

Run: `REVIEW_CATEGORY=<category> node tools/visual/shoot.js block-review --width=1600 --height=900` for each of: `process`, `timeline`. Shots land in `tools/visual/shots/review/<category>/`.

**Status:** ⬜ not started · **Agent:** — · **Last commit:** —

## Blocks

Columns are the §2 checks. Cell values: ⬜ not checked · ✅ pass (as-is) · 🔧 fixed · ❌ broken, not fixed (see Findings) · ⏸ blocked (see Findings) · n/a.

| Block | Category | Scope | Kind | C1 card | C2 drop+inspector | C3 wide | C4 narrow | C5 motion | C6 AI metadata | Status | Commit | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| tls.g.steps | process | group | layout | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | | |
| tls.g.chevrons | process | group | layout | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | | |
| tls.g.cycle | process | group | layout | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | | |
| tls.g.funnel | process | group | layout | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | | |
| tls.g.flow | process | group | layout | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | | |
| tls.c.steps | process | slide | layout | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | | |
| tls.g.timeline | timeline | group | layout | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | | |
| tls.g.roadmap | timeline | group | layout | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | | |
| tls.g.milestones | timeline | group | layout | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | | |
| tls.c.journey | timeline | slide | html | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | | |

## Findings

One entry per problem: block, check id, what was wrong (with the shot file name), what was done, and the test that now covers it. Problems outside this group's files go to README §5 Shared issues instead.

_None yet._

## Session log

| Date | Agent | Moved | Notes for next session |
|---|---|---|---|
