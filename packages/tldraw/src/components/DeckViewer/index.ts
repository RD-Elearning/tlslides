// Deliberately re-exports ONLY `DeckViewer`, not `DeckEmbed`. `DeckEmbed` wraps a full
// `<Tldraw readOnly>` (TldrawApp + MobX + canvas), and this file is the exact entry point Q14's
// bundle-size measurement bundles in isolation (`reviews/blocks/BACKLOG-demo.md` §7) — if it
// re-exported `DeckEmbed` too, bundling `./index` would pull the whole editor in regardless of
// which of the two a consumer actually imports, defeating the reason `<DeckViewer>` exists ("a
// viewer should not download the editor bundle"). `src/index.ts` (the package root) imports
// `DeckEmbed` from `./DeckEmbed` directly for exactly this reason.
export * from './DeckViewer'
