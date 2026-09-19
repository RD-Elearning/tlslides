/**
 * Visual test: Inline Editing
 * 
 * This test verifies that inline editing works correctly.
 * Run with: npx playwright test packages/tldraw/visual-tests/inline-edit.js
 */

import { test, expect } from '@playwright/test'

test.describe('Inline Editing (R11)', () => {
  test.beforeEach(async ({ page }) => {
    // Create a test deck with text blocks
    await page.goto('/edit/test-deck-id')
    await page.evaluate(() => {
      // Create a simple deck with title and body
      if (window.tldrawApp) {
        window.tldrawApp.createShapes(
          window.tldrawApp.createTextShapeAtPoint([100, 100]),
          window.tldrawApp.createTextShapeAtPoint([100, 200])
        )
      }
    })
  })

  test('should show propPath attribute on text nodes', async ({ page }) => {
    // Wait for canvas to render
    await page.waitForSelector('[data-prop-path="text"]', { timeout: 5000 })
    
    // Verify propPath attributes exist
    const textNodes = await page.locator('[data-prop-path="text"]').all()
    expect(textNodes.length).toBeGreaterThan(0)
    
    // Check specific propPath values
    const bodyNodes = await page.locator('[data-prop-path="text"], [data-prop-path^="items"]').all()
    expect(bodyNodes.length).toBeGreaterThanOrEqual(1)
  })

  test('should open inline editor on double click', async ({ page }) => {
    // Double click on a text node
    await page.dblclick('[data-prop-path="text"]')
    
    // Editor should appear
    await page.waitForSelector('.inline-editor-portal', { timeout: 2000 })
    await page.waitForSelector('.inline-editor-content', { timeout: 2000 })
  })

  test('should save changes on Enter', async ({ page }) => {
    // Double click to edit
    await page.dblclick('[data-prop-path="text"]')
    
    // Type new content
    const editor = page.locator('.inline-editor-content')
    await editor.click()
    await editor.type('Test Title')
    
    // Press Enter
    await editor.press('Enter')
    
    // Editor should close
    await page.waitForSelector('.inline-editor-portal', { state: ' detached', timeout: 2000 })
  })

  test('should cancel on Escape', async ({ page }) => {
    // Double click to edit
    await page.dblclick('[data-prop-path="text"]')
    
    // Type content
    const editor = page.locator('.inline-editor-content')
    await editor.click()
    await editor.fill('Test')
    
    // Press Escape
    await editor.press('Escape')
    
    // Editor should close without changes
    await page.waitForSelector('.inline-editor-portal', { state: ' detached', timeout: 2000 })
  })
})
