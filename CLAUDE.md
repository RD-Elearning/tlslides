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

Product/architecture review for building an AI slide builder on this repo:
**[reviews/README.md](reviews/README.md)** — current-state audit, style system, Next.js control
API, custom component blocks, AI/templates/animation, and a prioritized feature backlog. Its
**Current scope decision** section is the live plan: Next.js integration and the AI pipeline are
deferred, work is editor-only, and each item is mapped to the module it lands in.

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
