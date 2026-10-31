/** tls.c.gallery-wall — spro creative CR13 (the shared wave suite). */
import { tlsCGalleryWall, buildGalleryWall } from './index'
import { wave1Suite } from '../wave1-test'

wave1Suite({
  def: tlsCGalleryWall, build: buildGalleryWall, category: 'media', scope: 'slide',
  overflow: { items: [1, 2, 3, 4, 5, 6, 7].map((n) => ({ visual: 'x', label: String(n) })) },
  variants: { slot: 'variant', values: ["salon", "row"] },
  long: { items: [{ visual: 'heart', label: 'Lorem ipsum dolor sit amet con' }, { visual: 'users', label: 'Lorem ipsum dolor si' }, { visual: 'bed', label: 'Beds' }] }, parts: ["item[0]", "item[1]"],
})
