import { activityLabels } from './labels'

describe('activity labels by deck locale (S01)', () => {
  it('every available deck language has its own labels', () => {
    const en = activityLabels('en')
    for (const code of ['vi', 'fr', 'de', 'es', 'pt', 'it', 'nl', 'pl', 'tr', 'id', 'ms']) {
      const l = activityLabels(code)
      expect(l).not.toBe(en)
      expect(Object.keys(l).sort()).toEqual(Object.keys(en).sort())
      for (const v of Object.values(l)) expect(v.trim().length).toBeGreaterThan(0)
    }
  })
  it('French wording and its no-break space before "!"', () => {
    expect(activityLabels('fr-FR').check).toBe('Vérifier')
    expect(activityLabels('fr').correct).toBe('Correct !')
  })
  it('an unknown locale falls back to English', () => {
    expect(activityLabels('zh').check).toBe('Check')
    expect(activityLabels(undefined).retry).toBe('Try again')
  })
})
