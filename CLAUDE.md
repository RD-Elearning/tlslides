# tlslides

A fork of tldraw (1.9.x snapshot) with a "Deck"/slide-navigation layer added on top. Yarn Classic
workspaces + Turborepo monorepo. Full onboarding docs:
- **[guides/architecture.md](guides/architecture.md)** — what this repo is, monorepo layout, key
  gotchas about the built package output.
- **[guides/development.md](guides/development.md)** — install & run, incl. verified pnpm
  workarounds.
- **[guides/nextjs-integration.md](guides/nextjs-integration.md)** — embedding `<Tldraw>` in an
  existing Next.js app, and an assessment of this repo as a Canva-style slide product base.
- **[guides/documentation.md](guides/documentation.md)** — `<Tldraw>` props / data model /
  `TldrawApp` imperative API reference (pre-existing).
- **[guides/blocks-authoring.md](guides/blocks-authoring.md)** — running the deck demo, adding
  a block (layout kind today, html kind after R2), and the FastAPI/LLM integration flow.

Product/architecture review for building an AI slide builder on this repo:
**[reviews/README.md](reviews/README.md)** — current-state audit, style system, Next.js control
API, custom component blocks, AI/templates/animation, and a prioritized feature backlog. Its
**Current scope decision** section is the live plan: Next.js integration and the AI pipeline are
deferred, work is editor-only, and each item is mapped to the module it lands in.

Phase plans: 11–17 in **[reviews/roadmap-slides.md](reviews/roadmap-slides.md)** (all shipped),
18+ in **[reviews/blocks/README.md](reviews/blocks/README.md)** — the block system. The demo
slice (Q0–Q20, `BACKLOG-demo.md`) shipped 2026-09-17; `BACKLOG-enhance.md` (R0–R16) shipped
R0–R13 and parked R14–R16.

**Next work list: [reviews/blocks/block-authoring/README.md](reviews/blocks/block-authoring/README.md)**
(B1–B7 — nested HTML blocks, container children, padding/align, element toggles,
`defineCompositeBlock`, inspector, block gallery); one detail file per task.

The visual-fidelity slice has been attempted twice and is on its third plan. The **current work
list is [reviews/blocks/BACKLOG-visual-fix-2.md](reviews/blocks/BACKLOG-visual-fix-2.md)**
(G0–G6) — start there. Its §0 is the verified state of the tree (of the earlier V1–V8 and F0–F6
phases, only V1, V2.1, most of V3, V5's icon rendering and F1 actually landed), §2.1 is the reporting protocol, and every phase
carries an explicit "Done when" checklist plus a progress ledger in §4.
Its two predecessors stay binding for their content but **not for their status markers**:
[BACKLOG-visual.md](reviews/blocks/BACKLOG-visual.md) (V1–V8) holds the original analysis §1 and
the **working rules §2 — read those before writing any code**: verified test/lint/tsc commands,
the quality ratchets (the repo is *not* clean; do not chase zero) and a mandatory OOM guard for
the full test suite. [BACKLOG-visual-fix.md](reviews/blocks/BACKLOG-visual-fix.md) (F0–F6) holds
the still-unbuilt F4/F5 task detail that `-fix-2`'s G5 refers back to, and its §1 rules:
compile before you commit, a block not in `BUILT_IN_BLOCKS` does not exist, never invent
vocabulary, never touch dependency resolution, never weaken a test to make it pass.
The FastAPI/LLM backend design (deck profiles, pipeline stages, self-review, stack) is
**[reviews/blocks/LLM-ARCHITECTURE.md](reviews/blocks/LLM-ARCHITECTURE.md)**. Read that
README before touching anything under `packages/blocks` or `packages/tldraw/src/blocks`; it is the
entry point for P18–P32 and carries the governing rules (one layout + two renderers, spec-not-
pixels in the document, colors as roles, additive schema only).

`ppt-master/` and `transitions.dev/` are **git-ignored local clones** of reference skill
libraries — presentation-design guidance and a motion-token/transition recipe library. They are
design sources for `reviews/blocks/`, never dependencies; nothing in `packages/` may import from
them.

Key things not to relearn the hard way:
- `@tlslides/tldraw` / `@tlslides/core` are **not published to npm** — only usable by building
  this repo from source.
- The repo is pinned to `yarn@1.22.17` via `packageManager` in `package.json`; using pnpm instead
  requires the workarounds in `guides/development.md`.
- `packages/tldraw/dist` ships **transpiled** JS as of Phase 9 (`React.createElement`, no JSX), so
  a consumer no longer needs `transpilePackages` / `next-transpile-modules` — `examples/nextjs-
  sample` deliberately has no such config, which is what proves it. Before Phase 9 it shipped raw
  JSX, because esbuild inherited the workspace's `"jsx": "preserve"`; missing the transpile step
  then produced a cryptic runtime `Unexpected token '<'` rather than a build error. That is still
  the failure mode for a *pre-Phase-9* build, or for a host vendoring the `.tsx` source directly.
