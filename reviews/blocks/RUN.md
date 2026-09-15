# The run prompt

Paste §1 into a session to advance the block system by one task. It is designed to be pasted
**unchanged, every time** — it figures out where the work stands by reading the repo, not by being
told.

---

## 1. The prompt

```
Continue the tlslides block system. Work one task per run.

1. ORIENT
   Read reviews/blocks/CONTINUE.md (current state, verified commands, traps, review
   protocol), then reviews/blocks/BACKLOG.md (the task list; its status column is the
   single source of truth for progress).

   Re-measure the baselines yourself on the current tree — never quote a number out of
   a doc, they go stale:
     cd packages/tldraw && npx jest --silent 2>&1 | tail -6
     cd packages/tldraw && ./node_modules/.bin/tsc -p tsconfig.json --noEmit \
       --emitDeclarationOnly false 2>&1 | grep -E '^src/' | wc -l
     cd packages/tldraw && npx eslint src/blocks --ext .ts,.tsx 2>&1 | tail -3

   If the working tree is dirty, or anything fails before you have changed a line, stop
   and tell me. Do not build on a broken baseline.

2. PICK
   Take the first ⬜ task whose dependencies are all ✅, following BACKLOG.md's suggested
   order. Say which task and why in one line. Prefer the critical path when several are
   equally ready — A4 and A5 gate everything after them. If nothing is unblocked, say so
   and tell me what would unblock the most work.

3. IMPLEMENT
   Spawn ONE Sonnet subagent. Give it, verbatim: the task's Read / Do / Acceptance lines,
   the definition-of-done list at the top of BACKLOG.md, the baselines you just measured,
   and the verified commands from CONTINUE.md §4 (npx tsc and npx turbo are broken in
   this repo — it must use the forms given there). Tell it not to commit, and to name
   anything it could not do rather than hide it.

4. REVIEW — do not trust its report
   Re-run jest, diff the typecheck against the baseline, run eslint, and read the code.
   Then write your OWN independent check of the task's headline claim — not a re-run of
   its tests. Every task so far has contained a real bug that the implementer's own
   passing tests did not catch.

   Verify your own check before reporting a finding: a failing review test is sometimes
   the review's bug, and that has already happened once. Fix trivia yourself; send
   substantive findings back to the same agent with a reproduction, then re-verify.

5. LAND
   Update the task's status in BACKLOG.md, the tracker and current-state table in
   reviews/blocks/README.md, and append phase notes to reviews/blocks/08-phase-plan.md:
   mechanisms rather than "fixed a bug", and every scope cut named as a follow-up.
   Rebuild dist if the task changed package exports (examples/nextjs-sample consumes
   dist, not src). Commit to branch plan/block-system with the repo's attribution lines.

6. REPORT
   Which task; the numbers before and after; what you found in review; what you did not
   build; and which task is next.

If the task turns out to be bigger than one session, split it in BACKLOG.md rather than
half-finishing it.
```

---

## 2. Why each step is there

Not decoration — each one is a response to something that actually went wrong while building
P18 and P19.

| Step | Why |
|---|---|
| **Re-measure, never quote** | The plan shipped with a stale baseline: phase notes in `reviews/README.md` are in authoring order, not commit order, so the Phase 17 numbers were wrong for HEAD. A subagent compared against them and would have reported a false pass. |
| **Stop on a dirty tree** | Otherwise a later review cannot tell whose change broke what. |
| **Status column is the source of truth** | Progress lived in three places at one point and drifted. `BACKLOG.md` is now the one that counts; README's table is a summary of it. |
| **Hand it the verified commands** | `npx tsc` resolves to a doubled `node_modules/node_modules/...` path and dies; `npx turbo` grabs a version that rejects `--stream`; `cmd \| tail` followed by `$?` reports *tail's* status. All three have already caused a false "clean" result here. |
| **Do not trust the report** | Three real bugs so far, none caught by the implementer's own green tests: every shape sharing one hardcoded id (which `insertContent`'s id map silently collapses); `style: defaultStyle` aliasing a module-level singleton; a contrast solver reporting failure on a solution that existed. |
| **Write your own independent check** | Re-running their tests only proves their tests pass. The solver bug surfaced from a 1800-sample sweep written from scratch, not from any test in the repo. |
| **Verify your own check first** | A review test once failed because the reviewer used `preset.stops` where the fixture is `preset.background.stops`. The implementation was fine. Nearly a false accusation. |
| **Mechanisms in the notes** | "Fixed a bug" teaches nobody. The notes are what stop the same class recurring — module-level aliasing has now shipped here three times. |
| **Rebuild dist** | The reference Next.js app consumes `packages/tldraw/dist`. New exports are invisible in it until a rebuild, which reads as "the feature doesn't work". |
| **Split, don't half-finish** | A half-done task with a ✅ is worse than an honest ⬜. |

---

## 3. Variations

**Run several independent tasks at once.** Only when the dependency graph genuinely allows it —
E2/E4/E5/E6/E7 after E1, or Epic B alongside Epic A. Add to step 3: *"Spawn one subagent per task,
in parallel, and review each separately."* Do not parallelise tasks that touch the same files.

**Plan only, no implementation.** Replace steps 3–5 with: *"Do not implement. Write the subagent
brief you would send, and stop so I can read it."*

**Review something already written.** Skip to step 4 and name what to review.
