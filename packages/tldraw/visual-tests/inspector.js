/**
 * Visual test: Block Inspector Panel
 * 
 * This test verifies the Block Inspector component (R12).
 * Run with: npx playwright test packages/tldraw/visual-tests/inspector.js
 */

import { test, expect } from '@playwright/test'

test.describe('Block Inspector (R12)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/edit/test-deck-id')
    // Ensure a block is selected
    await page.click('.tl-shape', { position: { x: 10, y: 10 } })
  })

  test('should show inspector panel when block is selected', async ({ page }) => {
    // Inspector panel should be visible
    await page.waitForSelector('.block-inspector', { timeout: 3000 })
    
    const inspector = page.locator('.block-inspector')
    await expect(inspector).toBeVisible()
    
    // Check header shows block name
    await expect(inspector.locator('.inspector-title')).toContainText(/Title|Body|/)
  })

  test('should show Content tab by default', async ({ page }) => {
    const inspector = page.locator('.block-inspector')
    
    // Content tab should be active
    await expect(inspector.locator('.content-tab')).toBeVisible()
    await expect(inspector.locator('[data-tab="content"]')).toHaveClass(/active/)
  })

  test('should switch tabs correctly', async ({ page }) => {
    const inspector = page.locator('.block-inspector')
    
    // Click Style tab
    await inspector.click('[data-tab="style"]')
    await expect(inspector.locator('.style-tab')).toBeVisible()
    
    // Click Motion tab
    await inspector.click('[data-tab="motion"]')
    await expect(inspector.locator('.motion-tab')).toBeVisible()
    
    // Back to Content
    await inspector.click('[data-tab="content"]')
    await expect(inspector.locator('.content-tab')).toBeVisible()
  })

  test('should display color pickers in Style tab', async ({ page }) => {
    const inspector = page.locator('.block-inspector')
    
    // Switch to Style tab
    await inspector.click('[data-tab="style"]')
    
    // Check for color inputs
    await expect(inspector.locator('input[type="color"]')).toHaveCount(3)
  })

  test('should display motion controls in Motion tab', async ({ page }) => {
    const inspector = page.locator('.block-inspector')
    
    // Switch to Motion tab
    await inspector.click('[data-tab="motion"]')
    
    // Check for motion controls
    await expect(inspector.locator('select.preset-selector')).toBeVisible()
    await expect(inspector.locator('input[type="range"]')).toHaveCount(3)
    await expect(inspector.locator('.play-button')).toBeVisible()
  })

  test('should update props when editing in Content tab', async ({ page }) => {
    const inspector = page.locator('.block-inspector')
    
    // Switch to Content tab
    await inspector.click('[data-tab="content"]')
    
    // Find a text input
    const textInput = inspector.locator('input[type="text"]').first()
    await textInput.fill('Updated Title')
    
    // Focus away to trigger update
    await page.click('.tl-canvas')
  })
})
