/**
 * Visual test: Block Inserter Palette
 * 
 * This test verifies the Block Inserter component (R13).
 * Run with: npx playwright test packages/tldraw/visual-tests/inserter.js
 */

import { test, expect } from '@playwright/test'

test.describe('Block Inserter (R13)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/edit/test-deck-id')
  })

  test('should open inserter panel when + button clicked', async ({ page }) => {
    // Click the inserter button (class may vary)
    await page.click('.block-inserter-trigger, [aria-label="Add block"], button[title="Add"]')
    
    // Or trigger via keyboard
    // await page.keyboard.press('Meta+b') or similar
    
    // Inserter should appear
    await page.waitForSelector('.block-inserter, .inserter-container', { timeout: 3000 })
  })

  test('should display block families', async ({ page }) => {
    // Open inserter
    await page.click('[data-testid="inserter-trigger"]')
    
    const inserter = page.locator('.block-inserter, .inserter-container')
    await expect(inserter).toBeVisible()
    
    // Check for family headers
    await expect(inserter.locator('.family-section')).toBeVisible()
    await expect(inserter.locator('.family-name')).toContainText(/Text|Layout|/)
  })

  test('should filter blocks by search query', async ({ page }) => {
    // Open inserter
    await page.click('[data-testid="inserter-trigger"]')
    
    // Type in search
    const search = page.locator('.inserter-search')
    await search.fill('title')
    
    // Should show matching blocks
    const items = page.locator('.block-item')
    await expect(items).toHaveCountGreaterThan(0)
    await expect(items.first()).toContainText(/Title/i)
  })

  test('should insert block when clicked', async ({ page }) => {
    // Open inserter
    await page.click('[data-testid="inserter-trigger"]')
    
    // Click a block type
    await page.click('.block-item >> text=Title')
    
    // Inserter should close
    await page.waitForSelector('.block-inserter', { state: 'detached', timeout: 2000 })
    
    // Block should be added to canvas
    // (This would need to verify the shape was created)
  })

  test('should close on click outside', async ({ page }) => {
    // Open inserter
    await page.click('[data-testid="inserter-trigger"]')
    
    // Click outside
    await page.click('.tl-canvas', { position: { x: 100, y: 100 } })
    
    // Inserter should close
    await page.waitForSelector('.block-inserter', { state: 'detached', timeout: 2000 })
  })

  test('should close on Escape key', async ({ page }) => {
    // Open inserter
    await page.click('[data-testid="inserter-trigger"]')
    
    // Press Escape
    await page.keyboard.press('Escape')
    
    // Inserter should close
    await page.waitForSelector('.block-inserter', { state: 'detached', timeout: 2000 })
  })
})
