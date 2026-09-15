/* eslint-disable no-console */
/**
 * P19 — design tokens v2. Renders a role-swatch matrix: all 5 built-in themes (rows) x light /
 * dark / gradient surfaces (columns), each cell showing every colour role `resolveColor` produces
 * against that surface, with its contrast ratio and pass/fail.
 *
 * The point of this scenario, per doc 02 §2.4's own framing: a contrast failure is invisible to
 * every unit test (a ratio number in a jest assertion) but obvious in a screenshot — this repo has
 * been bitten by exactly that kind of invisible-to-tests bug six times (see 09-testing.md §9.1).
 * `surface.spec.ts`'s exhaustive sweep proves the numbers; this proves a human can *see* it.
 *
 * `resolveTokens`/`resolveColor`/`surfaceFromBackground` are pure, DOM-free functions with no UI
 * surface yet (P20 is what wires them into an actual block renderer) — there is nothing to click.
 * So, following the exact precedent `export.js` set for `renderPageToSvg` (see develop.tsx's own
 * comment), this scenario calls them directly via `window.resolveTokens` etc., exposed on the
 * /#/develop route for exactly this reason, and renders the result into plain DOM it builds itself
 * rather than through the editor.
 *
 * Uses the /develop route for `window.app` (see frame.js) — needed here only for the exposed pure
 * functions, not for any editor interaction.
 */
module.exports = {
  route: '/#/develop',
  async run(page) {
    // The default 1440x900 viewport clips the 5th theme row — 5 themes x 3 surfaces x 6 roles is
    // a genuinely tall matrix, and the whole point of this scenario is that it gets looked at.
    await page.setViewportSize({ width: 1600, height: 1150 })
    await page.waitForFunction(() => typeof window.resolveTokens === 'function')

    // A hand-written stand-in for the `northern-lights` GRADIENT_PRESETS entry (background.ts) —
    // not imported from it: GRADIENT_PRESETS isn't part of the package's public surface today
    // (state/shapes/index.ts doesn't re-export `shared`), and widening that export isn't this
    // phase's job. Same teal-to-navy gradient, same 135° default angle, so this exercises exactly
    // the surface the named bug (reviews/roadmap-slides.md) was reported against.
    const tealGradient = {
      type: 'linearGradient',
      angle: 135,
      stops: [
        { color: '#43CEA2', at: 0 },
        { color: '#185A9D', at: 1 },
      ],
    }

    const matrix = await page.evaluate((gradient) => {
      const PAGE_SIZE = [1920, 1080]
      const roles = ['surface', 'accent', 'accent2', 'text', 'textMuted', 'line']
      const surfaces = [
        { label: 'light', background: { type: 'solid', color: '#FFFFFF' }, box: { x: 0, y: 0, width: 100, height: 100 } },
        { label: 'dark', background: { type: 'solid', color: '#000000' }, box: { x: 0, y: 0, width: 100, height: 100 } },
        // Sampled near the dark end (bottom-right, per the 135° "to bottom right" convention) —
        // the exact end of the gradient the named bug was reported against.
        { label: 'gradient (dark end)', background: gradient, box: { x: 1820, y: 980, width: 100, height: 100 } },
      ]

      return window.BUILT_IN_DECK_THEMES.map((theme) => {
        const tokens = window.resolveTokens(theme)
        const cells = surfaces.map((surface) => {
          const ctx = window.surfaceFromBackground(surface.background, surface.box, PAGE_SIZE, theme)
          const swatches = roles.map((role) => {
            const result = window.resolveColor(role, ctx, tokens, theme)
            return { role, color: result.color, ratio: result.ratio, ok: result.ok }
          })
          return { label: surface.label, luminance: ctx.luminance, swatches }
        })
        return { id: theme.id, name: theme.name, cells }
      })
    }, tealGradient)

    // Render the matrix as plain DOM — this scenario deliberately does not go through the editor
    // or React at all, since there is no block renderer yet for tokens to flow through (P20).
    await page.evaluate((matrix) => {
      const readable = (label, ok) => (ok ? label : label + ' ⚠')
      const root = document.createElement('div')
      root.id = 'tokens-matrix'
      root.style.cssText =
        'position:fixed; inset:0; background:#0b0b0f; z-index:99999; padding:20px; ' +
        'font-family:system-ui, sans-serif; overflow:auto; display:grid; gap:14px; ' +
        `grid-template-columns: 170px repeat(${matrix[0].cells.length}, 1fr);`

      const corner = document.createElement('div')
      root.appendChild(corner)
      matrix[0].cells.forEach((cell) => {
        const h = document.createElement('div')
        h.textContent = cell.label
        h.style.cssText = 'color:#fff; font-weight:700; font-size:13px; align-self:end;'
        root.appendChild(h)
      })

      matrix.forEach((row) => {
        const rowLabel = document.createElement('div')
        rowLabel.textContent = row.name
        rowLabel.style.cssText = 'color:#fff; font-weight:700; font-size:13px; align-self:center;'
        root.appendChild(rowLabel)

        row.cells.forEach((cell) => {
          const cellEl = document.createElement('div')
          cellEl.style.cssText =
            'background:#1c1c22; border-radius:10px; padding:10px; display:flex; ' +
            'flex-direction:column; gap:5px;'
          cell.swatches.forEach((s) => {
            const chip = document.createElement('div')
            chip.style.cssText = 'display:flex; align-items:center; gap:8px;'
            const swatch = document.createElement('div')
            swatch.style.cssText =
              `width:22px; height:22px; border-radius:5px; flex:none; background:${s.color}; ` +
              'border:1px solid rgba(255,255,255,0.25);'
            const label = document.createElement('span')
            label.textContent = readable(`${s.role} ${s.color} (${s.ratio.toFixed(2)}:1)`, s.ok)
            label.style.cssText = `color:${s.ok ? '#e5e7eb' : '#f87171'}; font-size:11px; font-weight:${
              s.ok ? 400 : 700
            };`
            chip.appendChild(swatch)
            chip.appendChild(label)
            cellEl.appendChild(chip)
          })
          root.appendChild(cellEl)
        })
      })

      document.body.innerHTML = ''
      document.body.appendChild(root)
    }, matrix)

    await page.waitForTimeout(200)

    // The actual assertion this scenario exists to make visible: every text/textMuted/line
    // swatch either clears its floor or is honestly flagged — never a silent, illegible colour.
    const foregroundFindings = []
    for (const row of matrix) {
      for (const cell of row.cells) {
        for (const s of cell.swatches) {
          if (['text', 'textMuted', 'line'].includes(s.role)) {
            foregroundFindings.push({ theme: row.id, surface: cell.label, role: s.role, ratio: s.ratio, ok: s.ok })
          }
        }
      }
    }
    const anyNotOk = foregroundFindings.some((f) => !f.ok)

    return {
      themeCount: matrix.length,
      surfaceCount: matrix[0].cells.length,
      roleCount: matrix[0].cells[0].swatches.length,
      // The named bug's own case, called out explicitly: mono-grid's textMuted against the dark
      // end of the teal gradient.
      monoGridTextMutedOnGradient: foregroundFindings.find(
        (f) => f.theme === 'mono-grid' && f.surface === 'gradient (dark end)' && f.role === 'textMuted'
      ),
      anyForegroundRoleFailedItsFloor: anyNotOk,
    }
  },
}
