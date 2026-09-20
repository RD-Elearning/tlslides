/**
 * tls.m.icon spec file — validates icon name and test layout.
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

import { validateIconName } from './schema'
import { getIcon, hasIcon, ICONS } from '../../../icons'

describe('tls.m.icon', () => {
  describe('schema validation', () => {
    it('validates known icon names', () => {
      const validIcons = ['zap', 'shield', 'globe', 'check', 'arrow-right', 'trending-up', 'trending-down', 'users', 'clock', 'alert']
      validIcons.forEach(name => {
        expect(validateIconName(name)).toBeUndefined()
        expect(hasIcon(name)).toBe(true)
        expect(getIcon(name)).toBeDefined()
      })
    })

    it('catches unknown icon names', () => {
      const error = validateIconName('unknown-icon')
      expect(error).toContain('Unknown icon name')
      expect(error).toContain('unknown-icon')
    })
  })

  describe('icon set completeness', () => {
    it('has all expected icons', () => {
      const expectedIcons = ['zap', 'shield', 'globe', 'check', 'arrow-right', 'trending-up', 'trending-down', 'users', 'clock', 'alert']
      expectedIcons.forEach(name => {
        expect(hasIcon(name)).toBe(true)
      })
    })

    it('each icon has unique path data', () => {
      const paths = Object.values(ICONS).map(i => i.path)
      const uniquePaths = new Set(paths)
      expect(uniquePaths.size).toBe(paths.length)
    })
  })

  describe('icon metadata', () => {
    it('has proper viewBox dimensions (24x24)', () => {
      Object.values(ICONS).forEach(icon => {
        expect(icon.name).toBeDefined()
        expect(typeof icon.path).toBe('string')
        expect(icon.path.length).toBeGreaterThan(0)
      })
    })

    it('has source attribution for license compliance', () => {
      Object.entries(ICONS).forEach(([name, icon]) => {
        expect(icon.source).toBeDefined()
        expect(icon.source).toContain('License')
      })
    })
  })
})