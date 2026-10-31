/** tls.g.spectrum — spro creative CR13 (the shared wave suite). */
import { tlsGSpectrum, buildSpectrum } from './index'
import { wave1Suite } from '../wave1-test'

wave1Suite({
  def: tlsGSpectrum, build: buildSpectrum, category: 'comparison', scope: 'slide',
  overflow: { left: 'Lorem ipsum dolor sit amet consectetur a' },
  variants: { slot: 'variant', values: ["line", "gradient-bar", "slider"] },
  long: { left: 'Lorem ipsum dolor sit ', right: 'Lorem ipsum dolor sit ', items: [{ label: 'Lorem ipsum dolor sit amet', at: 0.1 }, { label: 'Lorem ipsum dolor si', at: 0.5 }, { label: 'Deep', at: 1 }] }, parts: ["poles", "items"],
})
