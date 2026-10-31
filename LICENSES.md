# Third-party art in the engine

Every pack below is generated into `packages/tldraw/src/blocks/icons/` by a script in `tools/icons/`
that checks the source's licence before writing; each generated file carries its licence header.
Packs not under MIT, ISC, Apache-2.0 or CC0 need the owner's approval before they are imported.

| Pack | Version | Licence | Used for | Generated file | Importer |
|---|---|---|---|---|---|
| Lucide | hand-copied paths | ISC | core outline icons | `icons/index.ts` | — |
| Tabler Icons | 3.46.0 | MIT (c) Paweł Kuna | outline icons by meaning | `icons/tabler.ts` | `import-tabler.mjs` |
| Phosphor Icons | @phosphor-icons/core 2.1.1 | MIT (c) Phosphor Icons | `look.icon: filled`, new subjects (gavel, sigma, tooth, …) | `icons/phosphor.ts` | `import-phosphor.mjs` |
| Fluent Emoji (flat) | microsoft/fluentui-emoji `main` | MIT (c) Microsoft Corporation | `tls.m.emoji`, `look.icon: emoji` | `icons/emoji.ts` | `import-emoji.mjs` |
| Open Doodles | react-open-doodles 1.0.5 | art CC0 (Pablo Stanley); wrapper MIT (c) 2020 Luna | `tls.m.illustration` | `icons/illustrations.ts` | `import-illustrations.mjs` |

Not imported: Open Peeps (CC0 art, but the `@opeepsfun/open-peeps` npm wrapper ships unreadable
files), Humaaans (CC BY 4.0: attribution needed, owner approval pending).
