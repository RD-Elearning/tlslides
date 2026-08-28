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
- `packages/tldraw/dist` ships un-transpiled JSX — any consumer must run it through a JSX-aware
  bundler step (`next-transpile-modules` / `transpilePackages` for Next.js).
